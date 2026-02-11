Procedimiento de Volcado y Sincronización Master (Modelos / Variantes / Precios)

Este documento recoge los SQL oficiales y el orden correcto para sincronizar el Master a partir de los POs importados.

Incluye dos modos de trabajo:

MODO A – DESARROLLO / IMPORT MASIVO: el precio “manda” por season (ignoramos fecha).

MODO B – OPERATIVO: el precio se aplica por fecha (valid_from <= po_date).

⚠️ Reglas generales

Ejecuta siempre en este orden.

Es seguro re-ejecutarlo (idempotente).

Textos normalizados con: lower(btrim(...))

reference NO vive en modelos, vive en modelo_variantes.

0️⃣ Preparación (SOLO UNA VEZ): constraint para variantes con reference

Motivo: necesitamos poder hacer ON CONFLICT con reference, y evitar el error:

“there is no unique or exclusion constraint matching the ON CONFLICT specification”

0.1 Crear reference_key (normaliza null → '')
alter table public.modelo_variantes
add column if not exists reference_key text
generated always as (coalesce(reference, '')) stored;

0.2 Crear constraint único válido para ON CONFLICT
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_modelo_variantes_modelo_season_color_referencekey'
  ) then
    alter table public.modelo_variantes
    add constraint uq_modelo_variantes_modelo_season_color_referencekey
    unique (modelo_id, season, color, reference_key);
  end if;
end $$;

1️⃣ Crear MODELOS desde líneas de pedido (match por style)

Crea modelos que aún no existan a partir de lineas_pedido.style.

Nota: la reference del modelo NO es relevante (la reference correcta vive en variantes). Aquí ponemos reference = style por defecto.

insert into public.modelos (style, supplier, customer, factory, reference, description)
select
  x.style,
  x.supplier,
  x.customer,
  x.factory,
  x.style as reference,
  'Auto-created from POs (import masivo)'::text as description
from (
  select distinct on (lower(btrim(lp.style)))
    btrim(lp.style) as style,
    p.supplier,
    p.customer,
    p.factory,
    coalesce(p.po_date, p.created_at::date) as base_date
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where lp.style is not null and btrim(lp.style) <> ''
  order by lower(btrim(lp.style)), coalesce(p.po_date, p.created_at::date) desc
) x
where not exists (
  select 1
  from public.modelos m
  where lower(btrim(m.style)) = lower(btrim(x.style))
);

2️⃣ Crear / actualizar VARIANTES (modelo + season + color + reference)

Regla nueva (IMPORTANTE):

Una variante por (modelo_id, season, color, reference_key)

Se queda con los datos de la PO más reciente

insert into public.modelo_variantes (modelo_id, season, color, factory, reference, notes, status)
select
  x.modelo_id,
  x.season,
  x.color,
  x.factory,
  x.reference,
  'Auto-created/updated from POs (latest po_date)'::text as notes,
  'activo'::text as status
from (
  select distinct on (
    lp.modelo_id,
    p.season,
    lower(btrim(lp.color)),
    lower(btrim(lp.reference))
  )
    lp.modelo_id,
    p.season,
    btrim(lp.color) as color,
    nullif(btrim(p.factory), '') as factory,
    nullif(btrim(lp.reference), '') as reference,
    coalesce(p.po_date, p.created_at::date, current_date) as po_date_norm
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where lp.modelo_id is not null
    and lp.color is not null and btrim(lp.color) <> ''
    and lp.reference is not null and btrim(lp.reference) <> ''
  order by
    lp.modelo_id,
    p.season,
    lower(btrim(lp.color)),
    lower(btrim(lp.reference)),
    coalesce(p.po_date, p.created_at::date, current_date) desc
) x
on conflict (modelo_id, season, color, reference_key)
do update set
  factory = coalesce(excluded.factory, public.modelo_variantes.factory),
  reference = coalesce(excluded.reference, public.modelo_variantes.reference),
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();

3️⃣ Backfill de modelo_id y variante_id en líneas
3.A modelo_id por style
update public.lineas_pedido lp
set modelo_id = m.id
from public.modelos m
where lp.modelo_id is null
  and lp.style is not null and btrim(lp.style) <> ''
  and lower(btrim(m.style)) = lower(btrim(lp.style));

3.B variante_id por modelo + season + color + reference (anti-error LP)
update public.lineas_pedido lp
set variante_id = v.id
from public.pos p, public.modelo_variantes v
where lp.po_id = p.id
  and lp.variante_id is null
  and lp.modelo_id is not null
  and lp.color is not null and btrim(lp.color) <> ''
  and lp.reference is not null and btrim(lp.reference) <> ''
  and v.modelo_id = lp.modelo_id
  and v.season = p.season
  and lower(btrim(v.color)) = lower(btrim(lp.color))
  and lower(btrim(v.reference)) = lower(btrim(lp.reference));

4️⃣ Volcar PRECIOS al master (modelo_precios) – USD

Regla (DESARROLLO / IMPORT MASIVO):

1 precio por (variante_id, season) (versionado por valid_from)

currency = 'USD'

Se toma la PO más reciente por variante+season

insert into public.modelo_precios (
  modelo_id,
  variante_id,
  season,
  currency,
  buy_price,
  sell_price,
  valid_from,
  notes
)
select
  x.modelo_id,
  x.variante_id,
  x.season,
  'USD'::text as currency,
  x.buy_price,
  x.sell_price,
  x.valid_from,
  'Imported from POs (latest po_date per variante+season)'::text as notes
from (
  select distinct on (lp.variante_id, p.season)
    lp.modelo_id,
    lp.variante_id,
    p.season,
    lp.price as buy_price,
    lp.price_selling as sell_price,
    coalesce(p.po_date, p.created_at::date, current_date) as valid_from
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where lp.variante_id is not null
    and lp.modelo_id is not null
    and lp.price is not null
  order by lp.variante_id, p.season, coalesce(p.po_date, p.created_at::date, current_date) desc
) x
on conflict (variante_id, valid_from)
do update set
  season = excluded.season,
  currency = excluded.currency,
  buy_price = excluded.buy_price,
  sell_price = excluded.sell_price,
  notes = excluded.notes,
  updated_at = now();

5️⃣ Snapshot de precios en lineas_pedido
✅ MODO A (DESARROLLO / IMPORT MASIVO): manda la season (ignora fecha)

Coge el último valid_from para esa variante_id + season.

with pick as (
  select
    lp2.id as linea_id,
    mp2.id as master_price_id
  from public.lineas_pedido lp2
  join public.pos p on p.id = lp2.po_id
  join lateral (
    select mp.id
    from public.modelo_precios mp
    where mp.variante_id = lp2.variante_id
      and mp.season = p.season
    order by mp.valid_from desc
    limit 1
  ) mp2 on true
  where lp2.variante_id is not null
    and lp2.master_price_id_used is null
)
update public.lineas_pedido lp
set
  master_buy_price_used   = mp.buy_price,
  master_sell_price_used  = mp.sell_price,
  master_currency_used    = mp.currency,
  master_valid_from_used  = mp.valid_from,
  master_price_id_used    = mp.id,
  master_price_source     = coalesce(lp.master_price_source, 'import_season_latest')
from pick
join public.modelo_precios mp on mp.id = pick.master_price_id
where lp.id = pick.linea_id;

✅ MODO B (OPERATIVO): manda la fecha (valid_from <= po_date)

Coge el último precio cuyo valid_from sea <= a la fecha base (prioridad: po.po_date, luego created_at, luego hoy).

with pick as (
  select
    lp2.id as linea_id,
    mp2.id as master_price_id
  from public.lineas_pedido lp2
  join public.pos p on p.id = lp2.po_id
  join lateral (
    select mp.id
    from public.modelo_precios mp
    where mp.variante_id = lp2.variante_id
      and mp.season = p.season
      and mp.valid_from <= coalesce(p.po_date, p.created_at::date, current_date)
    order by mp.valid_from desc
    limit 1
  ) mp2 on true
  where lp2.variante_id is not null
    and lp2.master_price_id_used is null
)
update public.lineas_pedido lp
set
  master_buy_price_used   = mp.buy_price,
  master_sell_price_used  = mp.sell_price,
  master_currency_used    = mp.currency,
  master_valid_from_used  = mp.valid_from,
  master_price_id_used    = mp.id,
  master_price_source     = coalesce(lp.master_price_source, 'operativo_by_date')
from pick
join public.modelo_precios mp on mp.id = pick.master_price_id
where lp.id = pick.linea_id;

6️⃣ Verificación final
select
  count(*) as total_lineas,
  count(*) filter (where modelo_id is not null) as con_modelo,
  count(*) filter (where variante_id is not null) as con_variante,
  count(*) filter (where master_price_id_used is not null) as con_snapshot,
  count(*) filter (where master_price_id_used is null) as sin_snapshot
from public.lineas_pedido;


Resultado esperado (DESARROLLO / IMPORT MASIVO):

sin_snapshot = 0

7️⃣ Diagnóstico si sin_snapshot > 0
7.A Ver qué variantes no tienen precio en esa season
select
  p.season,
  lp.variante_id,
  count(*) as filas
from public.lineas_pedido lp
join public.pos p on p.id = lp.po_id
where lp.master_price_id_used is null
group by p.season, lp.variante_id
order by filas desc
limit 100;


Versión: v2.0 (con reference en variantes + 2 modos de snapshot)
Relacionado con: Documento Maestro Production Tracker v6.5