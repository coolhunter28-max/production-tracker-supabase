# Procedimiento de Volcado y Sincronización Master

Este documento recoge **los SQL oficiales y el orden correcto de ejecución** para:
- Crear/actualizar **modelos** desde POs existentes
- Crear/actualizar **variantes** (modelo + season + color)
- Vincular líneas de pedido al master
- Volcar **precios en USD** al master
- Rellenar el **snapshot de precios** en `lineas_pedido`

Este procedimiento está pensado para **re-ejecutarse de forma segura** cada vez que se haga un volcado masivo durante fase de desarrollo.

---

## ⚠️ Reglas generales

- Todos los SQL están preparados para:
  - ignorar duplicados (`ON CONFLICT DO NOTHING / DO UPDATE`)
  - normalizar textos (`lower + btrim`)
- El orden **importa**.
- Es seguro ejecutar el proceso completo varias veces.

---

## 1️⃣ Crear MODELOS desde líneas de pedido

Crea modelos que aún no existan a partir de `lineas_pedido.style`.

```sql
insert into public.modelos (style, supplier, customer, factory, reference, description)
select
  s.style_norm as style,
  s.supplier,
  s.customer,
  s.factory,
  s.reference,
  null::text as description
from (
  select
    btrim(lp.style) as style_norm,
    max(p.supplier) as supplier,
    max(p.customer) as customer,
    max(p.factory) as factory,
    max(lp.reference) as reference
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where lp.style is not null
    and btrim(lp.style) <> ''
  group by btrim(lp.style)
) s
on conflict (style) do nothing;
```

---

## 2️⃣ Crear / actualizar VARIANTES (modelo + season + color)

Regla:
- Una variante por `(modelo_id, season, color)`
- Se queda con los datos de la PO **más reciente**

```sql
insert into public.modelo_variantes (modelo_id, season, color, factory, reference, notes, status)
select
  x.modelo_id,
  x.season,
  x.color,
  x.factory,
  x.reference,
  'Auto-created/updated from existing POs (latest po_date)'::text as notes,
  'activo'::text as status
from (
  select distinct on (m.id, p.season, lower(btrim(lp.color)))
    m.id as modelo_id,
    p.season,
    btrim(lp.color) as color,
    nullif(btrim(p.factory), '') as factory,
    nullif(btrim(lp.reference), '') as reference,
    coalesce(p.po_date, current_date) as po_date_norm
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  join public.modelos m
    on lower(btrim(m.style)) = lower(btrim(lp.style))
  where lp.color is not null
    and btrim(lp.color) <> ''
  order by m.id, p.season, lower(btrim(lp.color)), coalesce(p.po_date, current_date) desc
) x
on conflict (modelo_id, season, color)
do update set
  factory = coalesce(excluded.factory, public.modelo_variantes.factory),
  reference = coalesce(excluded.reference, public.modelo_variantes.reference),
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();
```

---

## 3️⃣ Backfill de `modelo_id` y `variante_id` en líneas

```sql
-- modelo_id por style
update public.lineas_pedido lp
set modelo_id = m.id
from public.modelos m
where lp.modelo_id is null
  and lower(btrim(m.style)) = lower(btrim(lp.style));

-- variante_id por modelo + season + color
update public.lineas_pedido lp
set variante_id = v.id
from public.pos p, public.modelo_variantes v
where lp.variante_id is null
  and lp.po_id = p.id
  and lp.modelo_id is not null
  and v.modelo_id = lp.modelo_id
  and v.season = p.season
  and lower(btrim(coalesce(v.color,''))) = lower(btrim(lp.color));
```

---

## 4️⃣ Volcar PRECIOS al master (`modelo_precios`) – USD

Regla:
- 1 precio por `(variante_id, season)`
- Se toma la PO más reciente
- `currency = 'USD'`

```sql
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
  'Imported from existing POs (latest po_date per variante+season)'::text as notes
from (
  select distinct on (lp.variante_id, p.season)
    lp.modelo_id,
    lp.variante_id,
    p.season,
    lp.price as buy_price,
    lp.price_selling as sell_price,
    coalesce(p.po_date, current_date) as valid_from
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where lp.variante_id is not null
    and lp.modelo_id is not null
    and lp.price is not null
  order by lp.variante_id, p.season, coalesce(p.po_date, current_date) desc
) x
on conflict (variante_id, valid_from)
do update set
  season = excluded.season,
  currency = excluded.currency,
  buy_price = excluded.buy_price,
  sell_price = excluded.sell_price,
  notes = excluded.notes,
  updated_at = now();
```

---

## 5️⃣ Snapshot de precios en `lineas_pedido`

### 5.A Desde precio de variante

```sql
update public.lineas_pedido lp
set
  master_buy_price_used = mp.buy_price,
  master_sell_price_used = mp.sell_price,
  master_currency_used = mp.currency,
  master_valid_from_used = mp.valid_from,
  master_price_id_used = mp.id,
  master_price_source = coalesce(lp.master_price_source, 'autofill')
from public.lineas_pedido lp2
join public.pos p on p.id = lp2.po_id
join lateral (
  select mp.*
  from public.modelo_precios mp
  where mp.variante_id = lp2.variante_id
    and mp.season = p.season
    and mp.valid_from <= coalesce(p.po_date, current_date)
  order by mp.valid_from desc
  limit 1
) mp on true
where lp.id = lp2.id
  and lp2.variante_id is not null
  and lp.master_price_id_used is null;
```

### 5.B Fallback desde precio base de modelo

```sql
update public.lineas_pedido lp
set
  master_buy_price_used = mp.buy_price,
  master_sell_price_used = mp.sell_price,
  master_currency_used = mp.currency,
  master_valid_from_used = mp.valid_from,
  master_price_id_used = mp.id,
  master_price_source = coalesce(lp.master_price_source, 'autofill')
from public.lineas_pedido lp2
join public.pos p on p.id = lp2.po_id
join lateral (
  select mp.*
  from public.modelo_precios mp
  where mp.modelo_id = lp2.modelo_id
    and mp.season = p.season
    and mp.variante_id is null
    and mp.valid_from <= coalesce(p.po_date, current_date)
  order by mp.valid_from desc
  limit 1
) mp on true
where lp.id = lp2.id
  and lp2.modelo_id is not null
  and lp.master_price_id_used is null;
```

---

## 6️⃣ Verificación final

```sql
select
  count(*) as total_lineas,
  count(*) filter (where master_price_id_used is not null) as con_snapshot,
  count(*) filter (where master_price_id_used is null) as sin_snapshot
from public.lineas_pedido;
```

---

## ✅ Resultado esperado

- Modelos y variantes siempre sincronizados con los POs
- Precios versionados en USD
- Snapshot histórico inmutable por línea
- Re-ejecutable sin miedo durante desarrollo

---

**Versión:** v1.0  
**Relacionado con:** Documento Maestro Production Tracker v6.5

