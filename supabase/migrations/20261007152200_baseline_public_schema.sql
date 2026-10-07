

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."executive_action_priority" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);


ALTER TYPE "public"."executive_action_priority" OWNER TO "postgres";


CREATE TYPE "public"."executive_action_status" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'WAITING',
    'RESOLVED',
    'DISMISSED'
);


ALTER TYPE "public"."executive_action_status" OWNER TO "postgres";


CREATE TYPE "public"."modelo_status" AS ENUM (
    'desarrollo',
    'activo',
    'en_fabricacion',
    'cancelado'
);


ALTER TYPE "public"."modelo_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_model_season_from_existing_season"("p_modelo_id" "uuid", "p_source_season" "text", "p_target_season" "text") RETURNS TABLE("created_variantes" integer, "created_componentes" integer, "created_imagenes" integer, "created_precios" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if p_modelo_id is null then
    raise exception 'modelo_id is required';
  end if;

  if nullif(trim(p_source_season), '') is null then
    raise exception 'source season is required';
  end if;

  if nullif(trim(p_target_season), '') is null then
    raise exception 'target season is required';
  end if;

  if trim(p_source_season) = trim(p_target_season) then
    raise exception 'source and target season must be different';
  end if;

  if not exists (
    select 1
    from modelo_variantes
    where modelo_id = p_modelo_id
      and season = trim(p_source_season)
  ) then
    raise exception 'No source variants found';
  end if;

  if exists (
    select 1
    from modelo_variantes
    where modelo_id = p_modelo_id
      and season = trim(p_target_season)
  ) then
    raise exception 'Target season already has variants for this model';
  end if;

  create temporary table tmp_variant_map (
    old_variante_id uuid primary key,
    new_variante_id uuid not null
  ) on commit drop;

  with source_variants as (
    select *
    from modelo_variantes
    where modelo_id = p_modelo_id
      and season = trim(p_source_season)
  ),
  inserted as (
    insert into modelo_variantes (
      modelo_id,
      season,
      color,
      factory,
      reference,
      notes,
      status
    )
    select
      modelo_id,
      trim(p_target_season),
      color,
      factory,
      reference,
      notes,
      'activo'
    from source_variants
    returning id, modelo_id, season, color, reference, reference_key
  )
  insert into tmp_variant_map (old_variante_id, new_variante_id)
  select s.id, i.id
  from source_variants s
  join inserted i
    on i.modelo_id = s.modelo_id
   and i.season = trim(p_target_season)
   and i.color = s.color
   and i.reference = s.reference
   and i.reference_key = s.reference_key;

  get diagnostics created_variantes = row_count;

  insert into modelo_componentes (
    modelo_id,
    kind,
    slot,
    catalogo_id,
    percentage,
    quality,
    material_text,
    extra,
    variante_id
  )
  select
    c.modelo_id,
    c.kind,
    c.slot,
    c.catalogo_id,
    c.percentage,
    c.quality,
    c.material_text,
    c.extra,
    m.new_variante_id
  from modelo_componentes c
  join tmp_variant_map m
    on m.old_variante_id = c.variante_id;

  get diagnostics created_componentes = row_count;

  insert into modelo_imagenes (
    modelo_id,
    file_key,
    public_url,
    kind,
    sort_order,
    width,
    height,
    mime_type,
    size_bytes,
    variante_id
  )
  select
    i.modelo_id,
    i.file_key,
    i.public_url,
    i.kind,
    i.sort_order,
    i.width,
    i.height,
    i.mime_type,
    i.size_bytes,
    m.new_variante_id
  from modelo_imagenes i
  join tmp_variant_map m
    on m.old_variante_id = i.variante_id
  where i.kind <> 'main';

  get diagnostics created_imagenes = row_count;

  with latest_prices as (
    select distinct on (p.variante_id)
      p.*
    from modelo_precios p
    join tmp_variant_map m
      on m.old_variante_id = p.variante_id
    where p.modelo_id = p_modelo_id
    order by p.variante_id, p.valid_from desc, p.created_at desc
  )
  insert into modelo_precios (
    modelo_id,
    season,
    currency,
    buy_price,
    sell_price,
    valid_from,
    notes,
    variante_id,
    category,
    size_run,
    channel
  )
  select
    lp.modelo_id,
    trim(p_target_season),
    lp.currency,
    lp.buy_price,
    lp.sell_price,
    current_date,
    lp.notes,
    m.new_variante_id,
    lp.category,
    lp.size_run,
    lp.channel
  from latest_prices lp
  join tmp_variant_map m
    on m.old_variante_id = lp.variante_id;

  get diagnostics created_precios = row_count;

  return next;
end;
$$;


ALTER FUNCTION "public"."activate_model_season_from_existing_season"("p_modelo_id" "uuid", "p_source_season" "text", "p_target_season" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."actualizar_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."actualizar_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_master_snapshot_for_line"("p_linea_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_po_id uuid;
  v_season text;
  v_po_date date;
  v_variante_id uuid;
  v_modelo_id uuid;
  v_price record;
begin
  -- 1) Cargar contexto de la lÃ­nea + PO
  select lp.po_id, lp.variante_id, lp.modelo_id
    into v_po_id, v_variante_id, v_modelo_id
  from public.lineas_pedido lp
  where lp.id = p_linea_id;

  if v_po_id is null then
    return jsonb_build_object('ok', false, 'reason', 'line_not_found_or_no_po');
  end if;

  select p.season, p.po_date
    into v_season, v_po_date
  from public.pos p
  where p.id = v_po_id;

  if v_season is null then
    return jsonb_build_object('ok', false, 'reason', 'po_without_season');
  end if;

  if v_variante_id is null then
    -- Si no hay variante, no podemos snapshot de variante
    return jsonb_build_object('ok', false, 'reason', 'line_without_variante_id');
  end if;

  -- 2) Elegir mejor precio (pasado si existe, si no futuro mÃ¡s cercano)
  select mp.*
  into v_price
  from public.modelo_precios mp
  where mp.variante_id = v_variante_id
    and mp.season = v_season
  order by
    case when mp.valid_from <= coalesce(v_po_date, current_date) then 0 else 1 end,
    case when mp.valid_from <= coalesce(v_po_date, current_date) then mp.valid_from end desc,
    case when mp.valid_from  > coalesce(v_po_date, current_date) then mp.valid_from end asc
  limit 1;

  if v_price.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_master_price_found');
  end if;

  -- 3) Guardar snapshot en la lÃ­nea
  update public.lineas_pedido lp
  set
    master_buy_price_used   = v_price.buy_price,
    master_sell_price_used  = v_price.sell_price,
    master_currency_used    = v_price.currency,
    master_valid_from_used  = v_price.valid_from,
    master_price_id_used    = v_price.id,
    master_price_source     = 'autofill_api_put'
  where lp.id = p_linea_id;

  return jsonb_build_object(
    'ok', true,
    'linea_id', p_linea_id,
    'precio_id', v_price.id,
    'valid_from', v_price.valid_from,
    'currency', v_price.currency
  );
end;
$$;


ALTER FUNCTION "public"."apply_master_snapshot_for_line"("p_linea_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_can_see_all_customers"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_role() in ('ADMIN', 'MANAGER');
$$;


ALTER FUNCTION "public"."current_user_can_see_all_customers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_user_role() = 'ADMIN';
$$;


ALTER FUNCTION "public"."current_user_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (
      select role
      from public.user_profiles
      where id = auth.uid()
        and is_active = true
      limit 1
    ),
    'VIEWER'
  );
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql_query" "text") RETURNS TABLE("result" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Esta es una funciÃ³n simplificada que solo funciona para INSERT
  -- Para un entorno de producciÃ³n, necesitarÃ­as una implementaciÃ³n mÃ¡s segura
  RETURN QUERY SELECT 'SQL ejecutado'::TEXT AS result;
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_alertas"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO alertas (tipo, subtipo, po_id, linea_pedido_id, fecha, es_estimada, leida)
  SELECT
    tipo,
    subtipo,
    po_id,
    linea_pedido_id,
    fecha_alerta,
    es_estimada,
    false
  FROM v_alertas_candidatas
  ON CONFLICT (tipo, subtipo, po_id, linea_pedido_id)
  DO UPDATE SET
    fecha = EXCLUDED.fecha,
    es_estimada = EXCLUDED.es_estimada,
    leida = false;

  RAISE NOTICE 'âœ… Alertas generadas o actualizadas correctamente.';
END;
$$;


ALTER FUNCTION "public"."generar_alertas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_intelligence_focus_season_v1"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text", "p_alert_level" "text" DEFAULT NULL::"text", "p_source_module" "text" DEFAULT NULL::"text") RETURNS TABLE("customer" "text", "alert_level" "text", "alert_type" "text", "alert_reason" "text", "recommended_action" "text", "alert_priority" integer, "contextual_business_profile" "text", "contextual_business_score" numeric, "customer_friction_score" numeric, "health_signal" "text", "health_reason" "text", "volume_signal" "text", "qty_growth_pct" numeric, "sell_growth_pct" numeric, "xiamen_context_flag" boolean, "customer_size_band" "text", "profitability_band" "text", "contribution_pct" numeric, "xiamen_sales_mix_pct" numeric, "bsg_sales_mix_pct" numeric, "score_model" "text", "health_priority" integer, "source_module" "text")
    LANGUAGE "sql" STABLE
    AS $$
with scoped_customers as (
  select distinct f.customer
  from public.mv_fact_operacion_linea_v2 f
  where (p_season is null or f.season = p_season)
    and (p_customer is null or f.customer = p_customer)
    and (p_factory is null or f.factory = p_factory)
),

season_xiamen_signals as (
  select
    x.customer,
    x.season,
    x.qty_growth_pct,
    x.sell_growth_pct,
    x.volume_signal
  from public.vw_xiamen_customer_season_volume_evolution x
  join scoped_customers sc
    on sc.customer = x.customer
  where (p_season is null or x.season = p_season)
),

season_adjusted_signals as (
  select
    v.customer,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then 'CRITICAL'
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then 'WARNING'
      else v.alert_level
    end as alert_level,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then 'XIAMEN_VOLUME_DROP'
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then 'XIAMEN_VOLUME_SOFT_DROP'
      else v.alert_type
    end as alert_type,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then
        'CaÃ­da crÃ­tica de volumen Xiamen en la season filtrada.'
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then
        'CaÃ­da moderada de volumen Xiamen en la season filtrada.'
      else v.alert_reason
    end as alert_reason,
    case
      when xs.volume_signal in ('VOLUME_DROP_RISK', 'VOLUME_SOFT_DROP') then
        'Revisar pipeline de prÃ³xima temporada y contactar al cliente para entender la caÃ­da.'
      else v.recommended_action
    end as recommended_action,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then 1
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then 2
      else v.alert_priority
    end as alert_priority,
    v.contextual_business_profile,
    v.contextual_business_score,
    v.customer_friction_score,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then 'CRITICAL'
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then 'WARNING'
      else v.health_signal
    end as health_signal,
    v.health_reason,
    coalesce(xs.volume_signal, v.volume_signal) as volume_signal,
    coalesce(xs.qty_growth_pct, v.qty_growth_pct) as qty_growth_pct,
    coalesce(xs.sell_growth_pct, v.sell_growth_pct) as sell_growth_pct,
    v.xiamen_context_flag,
    v.customer_size_band,
    v.profitability_band,
    v.contribution_pct,
    v.xiamen_sales_mix_pct,
    v.bsg_sales_mix_pct,
    v.score_model,
    case
      when xs.volume_signal = 'VOLUME_DROP_RISK' then 1
      when xs.volume_signal = 'VOLUME_SOFT_DROP' then 2
      else v.health_priority
    end as health_priority,
    v.source_module
  from public.vw_exec_intelligence_focus_v1 v
  join scoped_customers sc
    on sc.customer = v.customer
  left join season_xiamen_signals xs
    on xs.customer = v.customer
  where (p_alert_level is null or v.alert_level = p_alert_level)
    and (p_source_module is null or v.source_module = p_source_module)
)

select *
from season_adjusted_signals
order by
  alert_priority asc,
  contextual_business_score asc nulls last,
  customer asc;
$$;


ALTER FUNCTION "public"."get_exec_intelligence_focus_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_intelligence_focus_v1"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text", "p_alert_level" "text" DEFAULT NULL::"text", "p_source_module" "text" DEFAULT NULL::"text") RETURNS TABLE("customer" "text", "alert_level" "text", "alert_type" "text", "alert_reason" "text", "recommended_action" "text", "alert_priority" integer, "contextual_business_profile" "text", "contextual_business_score" numeric, "customer_friction_score" numeric, "health_signal" "text", "health_reason" "text", "volume_signal" "text", "qty_growth_pct" numeric, "sell_growth_pct" numeric, "xiamen_context_flag" boolean, "customer_size_band" "text", "profitability_band" "text", "contribution_pct" numeric, "xiamen_sales_mix_pct" numeric, "bsg_sales_mix_pct" numeric, "score_model" "text", "health_priority" integer, "source_module" "text")
    LANGUAGE "sql" STABLE
    AS $$
  with scoped_customers as (
    select distinct f.customer
    from public.mv_fact_operacion_linea_v2 f
    where (p_season is null or f.season = p_season)
      and (p_customer is null or f.customer = p_customer)
      and (p_factory is null or f.factory = p_factory)
  )
  select
    i.customer,
    i.alert_level,
    i.alert_type,
    i.alert_reason,
    i.recommended_action,
    i.alert_priority,
    i.contextual_business_profile,
    i.contextual_business_score,
    i.customer_friction_score,
    i.health_signal,
    i.health_reason,
    i.volume_signal,
    i.qty_growth_pct,
    i.sell_growth_pct,
    i.xiamen_context_flag,
    i.customer_size_band,
    i.profitability_band,
    i.contribution_pct,
    i.xiamen_sales_mix_pct,
    i.bsg_sales_mix_pct,
    i.score_model,
    i.health_priority,
    i.source_module
  from public.vw_exec_intelligence_focus_v1 i
  join scoped_customers sc
    on sc.customer = i.customer
  where (p_alert_level is null or i.alert_level = p_alert_level)
    and (p_source_module is null or i.source_module = p_source_module)
  order by
    i.alert_priority asc,
    i.contextual_business_score asc nulls last,
    i.customer asc;
$$;


ALTER FUNCTION "public"."get_exec_intelligence_focus_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_narrative_season_v1"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text") RETURNS TABLE("narrative_order" integer, "narrative_code" "text", "narrative_level" "text", "narrative_text" "text", "customer" "text", "recommended_action" "text")
    LANGUAGE "sql" STABLE
    AS $$
with scoped_customers as (
  select distinct f.customer
  from public.mv_fact_operacion_linea_v2 f
  where (p_season is null or f.season = p_season)
    and (p_customer is null or f.customer = p_customer)
    and (p_factory is null or f.factory = p_factory)
),

season_xiamen_signals as (
  select
    x.customer,
    x.season,
    x.qty_growth_pct,
    x.sell_growth_pct,
    x.volume_signal
  from public.vw_xiamen_customer_season_volume_evolution x
  join scoped_customers sc
    on sc.customer = x.customer
  where (p_season is null or x.season = p_season)
),

scoped_signals as (
  select
    v.*
  from public.vw_exec_intelligence_focus_v1 v
  join scoped_customers sc
    on sc.customer = v.customer
  left join season_xiamen_signals xs
    on xs.customer = v.customer
  where
    (
      v.alert_type <> 'XIAMEN_VOLUME_DROP'
      or xs.volume_signal = 'VOLUME_DROP_RISK'
    )
),

critical_signal as (
  select *
  from scoped_signals
  where alert_level = 'CRITICAL'
  order by alert_priority asc, contextual_business_score asc nulls last
  limit 1
),

critical_count as (
  select count(*) as total
  from scoped_signals
  where alert_level = 'CRITICAL'
),

warning_count as (
  select count(*) as total
  from scoped_signals
  where alert_level = 'WARNING'
),

top_xiamen_drop as (
  select *
  from season_xiamen_signals
  where volume_signal = 'VOLUME_DROP_RISK'
  order by qty_growth_pct asc nulls last
  limit 1
),

top_xiamen_growth as (
  select *
  from season_xiamen_signals
  where volume_signal = 'GROWING'
  order by sell_growth_pct desc nulls last, qty_growth_pct desc nulls last
  limit 1
)

select
  1,
  'SEASON_PORTFOLIO_STATUS',
  case
    when (select total from critical_count) > 0 then 'CRITICAL'
    when (select total from warning_count) > 0 then 'WARNING'
    else 'HEALTHY'
  end,
  case
    when (select total from critical_count) > 0 then
      'En ' || coalesce(p_season, 'el contexto actual') ||
      ' hay ' || (select total from critical_count) ||
      ' cliente(s) en situaciÃ³n crÃ­tica y ' ||
      (select total from warning_count) ||
      ' en warning.'
    when (select total from warning_count) > 0 then
      'En ' || coalesce(p_season, 'el contexto actual') ||
      ' no hay crÃ­ticos, pero hay ' ||
      (select total from warning_count) ||
      ' cliente(s) en warning.'
    else
      'En ' || coalesce(p_season, 'el contexto actual') ||
      ' no hay seÃ±ales crÃ­ticas relevantes para el contexto actual.'
  end,
  null::text,
  case
    when (select total from critical_count) > 0 then
      'Revisar clientes crÃ­ticos y priorizar acciones comerciales.'
    when (select total from warning_count) > 0 then
      'Revisar clientes warning antes de nuevas decisiones comerciales.'
    else null::text
  end

union all

select
  2,
  'TOP_CRITICAL',
  'CRITICAL',
  'El foco principal es ' || customer || ': ' || alert_reason ||
    case
      when qty_growth_pct is not null then
        ' CaÃ­da de volumen: ' || round(qty_growth_pct, 1) || '%.'
      else ''
    end ||
    case
      when sell_growth_pct is not null then
        ' CaÃ­da de facturaciÃ³n: ' || round(sell_growth_pct, 1) || '%.'
      else ''
    end,
  customer,
  recommended_action
from critical_signal

union all

select
  3,
  'SEASON_XIAMEN_DROP',
  'CRITICAL',
  'En ' || season || ', ' || customer ||
  ' presenta caÃ­da crÃ­tica Xiamen: volumen ' ||
  round(qty_growth_pct, 1) || '% y facturaciÃ³n ' ||
  round(sell_growth_pct, 1) || '%.',
  customer,
  'Revisar pipeline de prÃ³xima temporada y contactar al cliente para entender la caÃ­da.'
from top_xiamen_drop

union all

select
  4,
  'SEASON_WARNING',
  'WARNING',
  'Hay ' || (select total from warning_count) ||
  ' cliente(s) en warning comercial u operativo.',
  null::text,
  'Revisar clientes warning antes de nuevas decisiones comerciales.'
where (select total from warning_count) > 0

union all

select
  5,
  'SEASON_XIAMEN_GROWTH',
  'HEALTHY',
  'Oportunidad Xiamen en ' || season || ': ' || customer ||
    case
      when sell_growth_pct is not null then
        ' crece en facturaciÃ³n un ' || round(sell_growth_pct, 1) || '%.'
      when qty_growth_pct is not null then
        ' crece en volumen un ' || round(qty_growth_pct, 1) || '%.'
      else ' muestra evoluciÃ³n positiva.'
    end,
  customer,
  'Evaluar potencial comercial para la prÃ³xima temporada.'
from top_xiamen_growth

order by 1;
$$;


ALTER FUNCTION "public"."get_exec_narrative_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_narrative_v1"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text") RETURNS TABLE("narrative_order" integer, "narrative_code" "text", "narrative_level" "text", "narrative_text" "text", "customer" "text", "recommended_action" "text")
    LANGUAGE "sql" STABLE
    AS $$
  with scoped_customers as (
    select distinct f.customer
    from public.mv_fact_operacion_linea_v2 f
    where (p_season is null or f.season = p_season)
      and (p_customer is null or f.customer = p_customer)
      and (p_factory is null or f.factory = p_factory)
  ),

  focus as (
    select i.*
    from public.vw_exec_intelligence_focus_v1 i
    join scoped_customers sc
      on sc.customer = i.customer
  ),

  summary as (
    select
      count(*) filter (where alert_level = 'CRITICAL') as critical_count,
      count(*) filter (where alert_level = 'WARNING') as warning_count,
      count(*) filter (where alert_level = 'MONITOR') as monitor_count,
      count(*) filter (where alert_level = 'HEALTHY') as healthy_count,
      count(*) as total_signals
    from focus
  ),

  top_critical as (
    select
      customer,
      alert_reason,
      recommended_action,
      qty_growth_pct,
      sell_growth_pct,
      score_model
    from focus
    where alert_level = 'CRITICAL'
    order by contextual_business_score asc nulls last, customer asc
    limit 1
  ),

  top_growth as (
    select
      customer,
      qty_growth_pct,
      sell_growth_pct
    from focus
    where alert_level = 'HEALTHY'
      and score_model = 'XIAMEN_VOLUME_BASED'
    order by sell_growth_pct desc nulls last, qty_growth_pct desc nulls last
    limit 1
  ),

  bsg_warning as (
    select
      count(*) as bsg_warning_count
    from focus
    where alert_level = 'WARNING'
      and score_model = 'STANDARD_BUSINESS_MATRIX'
  )

  select
    1 as narrative_order,
    'PORTFOLIO_STATUS'::text as narrative_code,
    case
      when s.critical_count > 0 then 'CRITICAL'
      when s.warning_count > 0 then 'WARNING'
      when s.monitor_count > 0 then 'MONITOR'
      else 'HEALTHY'
    end as narrative_level,
    case
      when s.total_signals = 0 then
        'No hay seÃ±ales ejecutivas para el contexto actual.'
      when s.critical_count > 0 then
        'La cartera tiene ' || s.critical_count || ' cliente(s) en situaciÃ³n crÃ­tica y ' || s.warning_count || ' en warning.'
      when s.warning_count > 0 then
        'La cartera no tiene crÃ­ticos, pero mantiene ' || s.warning_count || ' cliente(s) en warning.'
      else
        'La cartera no muestra seÃ±ales crÃ­ticas relevantes en el contexto actual.'
    end as narrative_text,
    null::text as customer,
    null::text as recommended_action
  from summary s

  union all

  select
    2,
    'TOP_CRITICAL',
    'CRITICAL',
    'El foco principal es ' || customer || ': ' || alert_reason ||
      case
        when qty_growth_pct is not null then ' CaÃ­da de volumen: ' || round(qty_growth_pct, 1) || '%.'
        else ''
      end ||
      case
        when sell_growth_pct is not null then ' CaÃ­da de facturaciÃ³n: ' || round(sell_growth_pct, 1) || '%.'
        else ''
      end,
    customer,
    recommended_action
  from top_critical

  union all

  select
    3,
    'BSG_WARNING_CLUSTER',
    'WARNING',
    'Hay ' || bsg_warning_count || ' cliente(s) BSG con fricciÃ³n elevada o perfil de riesgo comercial.',
    null::text,
    'Revisar clientes BSG en warning antes de nuevas campaÃ±as comerciales.'
  from bsg_warning
  where bsg_warning_count > 0

  union all

  select
    4,
    'XIAMEN_GROWTH_OPPORTUNITY',
    'HEALTHY',
    'Oportunidad de crecimiento en Xiamen: ' || customer ||
      case
        when sell_growth_pct is not null then ' crece en facturaciÃ³n un ' || round(sell_growth_pct, 1) || '%.'
        when qty_growth_pct is not null then ' crece en volumen un ' || round(qty_growth_pct, 1) || '%.'
        else ' muestra evoluciÃ³n positiva.'
      end,
    customer,
    'Evaluar potencial comercial para la prÃ³xima temporada.'
  from top_growth

  order by narrative_order;
$$;


ALTER FUNCTION "public"."get_exec_narrative_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_summary_context_v2"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text") RETURNS TABLE("po_count" bigint, "line_count" bigint, "customer_count" bigint, "factory_count" bigint, "model_count" bigint, "qty_total" numeric, "sell_amount_total" numeric, "buy_amount_total" numeric, "margin_bsg_total" numeric, "margin_xiamen_total" numeric, "contribution_total" numeric, "contribution_pct" numeric, "xiamen_sales_mix_pct" numeric, "bsg_sales_mix_pct" numeric, "xiamen_margin_pct" numeric, "bsg_margin_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
        COUNT(DISTINCT f.po_id) AS po_count,
        COUNT(*) AS line_count,
        COUNT(DISTINCT f.customer) AS customer_count,
        COUNT(DISTINCT f.factory) AS factory_count,
        COUNT(DISTINCT f.modelo_id) AS model_count,
        COALESCE(SUM(f.qty), 0)::numeric AS qty_total,

        ROUND(
            COALESCE(SUM(f.sell_amount_real), 0),
            2
        ) AS sell_amount_total,

        ROUND(
            COALESCE(
                SUM(COALESCE(f.buy_amount_real, 0)),
                0
            ),
            2
        ) AS buy_amount_total,

        ROUND(
            COALESCE(
                SUM(
                    CASE
                        WHEN f.operativa_code = 'BSG'
                            THEN f.contribution_amount
                        ELSE 0
                    END
                ),
                0
            ),
            2
        ) AS margin_bsg_total,

        ROUND(
            COALESCE(
                SUM(
                    CASE
                        WHEN f.operativa_code = 'XIAMEN_DIC'
                            THEN f.contribution_amount
                        ELSE 0
                    END
                ),
                0
            ),
            2
        ) AS margin_xiamen_total,

        ROUND(
            COALESCE(SUM(f.contribution_amount), 0),
            2
        ) AS contribution_total,

        ROUND(
            SUM(f.contribution_amount)
            / NULLIF(SUM(f.sell_amount_real), 0)
            * 100,
            2
        ) AS contribution_pct,

        ROUND(
            SUM(
                CASE
                    WHEN f.operativa_code = 'XIAMEN_DIC'
                        THEN f.sell_amount_real
                    ELSE 0
                END
            )
            / NULLIF(SUM(f.sell_amount_real), 0)
            * 100,
            2
        ) AS xiamen_sales_mix_pct,

        ROUND(
            SUM(
                CASE
                    WHEN f.operativa_code = 'BSG'
                        THEN f.sell_amount_real
                    ELSE 0
                END
            )
            / NULLIF(SUM(f.sell_amount_real), 0)
            * 100,
            2
        ) AS bsg_sales_mix_pct,

        ROUND(
            SUM(
                CASE
                    WHEN f.operativa_code = 'XIAMEN_DIC'
                        THEN f.contribution_amount
                    ELSE 0
                END
            )
            / NULLIF(
                SUM(
                    CASE
                        WHEN f.operativa_code = 'XIAMEN_DIC'
                            THEN f.sell_amount_real
                        ELSE 0
                    END
                ),
                0
            )
            * 100,
            2
        ) AS xiamen_margin_pct,

        ROUND(
            SUM(
                CASE
                    WHEN f.operativa_code = 'BSG'
                        THEN f.contribution_amount
                    ELSE 0
                END
            )
            / NULLIF(
                SUM(
                    CASE
                        WHEN f.operativa_code = 'BSG'
                            THEN f.sell_amount_real
                        ELSE 0
                    END
                ),
                0
            )
            * 100,
            2
        ) AS bsg_margin_pct

    FROM public.mv_fact_operacion_linea_v2 f

    WHERE
        (
            p_include_all = true
            OR (
                p_seasons IS NOT NULL
                AND f.season = ANY(p_seasons)
            )
        )
        AND (
            p_customer IS NULL
            OR f.customer = p_customer
        )
        AND (
            p_factory IS NULL
            OR f.factory = p_factory
        );
$$;


ALTER FUNCTION "public"."get_exec_summary_context_v2"("p_seasons" "text"[], "p_include_all" boolean, "p_customer" "text", "p_factory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_summary_v2"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text") RETURNS TABLE("po_count" bigint, "line_count" bigint, "customer_count" bigint, "factory_count" bigint, "model_count" bigint, "qty_total" numeric, "sell_amount_total" numeric, "buy_amount_total" numeric, "margin_bsg_total" numeric, "margin_xiamen_total" numeric, "contribution_total" numeric, "contribution_pct" numeric, "xiamen_sales_mix_pct" numeric, "bsg_sales_mix_pct" numeric, "xiamen_margin_pct" numeric, "bsg_margin_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select
    count(distinct po_id) as po_count,
    count(*) as line_count,
    count(distinct customer) as customer_count,
    count(distinct factory) as factory_count,
    count(distinct modelo_id) as model_count,
    sum(qty) as qty_total,

    round(sum(sell_amount_real), 2) as sell_amount_total,
    round(sum(coalesce(buy_amount_real, 0)), 2) as buy_amount_total,

    round(sum(case when operativa_code = 'BSG' then contribution_amount else 0 end), 2) as margin_bsg_total,
    round(sum(case when operativa_code = 'XIAMEN_DIC' then contribution_amount else 0 end), 2) as margin_xiamen_total,
    round(sum(contribution_amount), 2) as contribution_total,

    round(sum(contribution_amount) / nullif(sum(sell_amount_real), 0) * 100, 2) as contribution_pct,

    round(
      sum(case when operativa_code = 'XIAMEN_DIC' then sell_amount_real else 0 end)
      / nullif(sum(sell_amount_real), 0) * 100,
      2
    ) as xiamen_sales_mix_pct,

    round(
      sum(case when operativa_code = 'BSG' then sell_amount_real else 0 end)
      / nullif(sum(sell_amount_real), 0) * 100,
      2
    ) as bsg_sales_mix_pct,

    round(
      sum(case when operativa_code = 'XIAMEN_DIC' then contribution_amount else 0 end)
      / nullif(sum(case when operativa_code = 'XIAMEN_DIC' then sell_amount_real else 0 end), 0)
      * 100,
      2
    ) as xiamen_margin_pct,

    round(
      sum(case when operativa_code = 'BSG' then contribution_amount else 0 end)
      / nullif(sum(case when operativa_code = 'BSG' then sell_amount_real else 0 end), 0)
      * 100,
      2
    ) as bsg_margin_pct

  from public.mv_fact_operacion_linea_v2
  where (p_season is null or season = p_season)
    and (p_customer is null or customer = p_customer)
    and (p_factory is null or factory = p_factory);
$$;


ALTER FUNCTION "public"."get_exec_summary_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exec_summary_with_delta_v2"("p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text") RETURNS TABLE("season" "text", "po_count" bigint, "line_count" bigint, "customer_count" bigint, "factory_count" bigint, "model_count" bigint, "qty_total" numeric, "sell_amount_total" numeric, "buy_amount_total" numeric, "margin_bsg_total" numeric, "margin_xiamen_total" numeric, "contribution_total" numeric, "contribution_pct" numeric, "xiamen_sales_mix_pct" numeric, "bsg_sales_mix_pct" numeric, "xiamen_margin_pct" numeric, "bsg_margin_pct" numeric, "previous_season" "text", "sell_amount_previous" numeric, "contribution_previous" numeric, "contribution_pct_previous" numeric, "sell_amount_delta_pct" numeric, "contribution_delta_pct" numeric, "contribution_pct_delta_pp" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  with season_summary as (
    select
      f.season,

      count(distinct f.po_id) as po_count,
      count(*) as line_count,
      count(distinct f.customer) as customer_count,
      count(distinct f.factory) as factory_count,
      count(distinct f.modelo_id) as model_count,
      sum(f.qty) as qty_total,

      round(sum(f.sell_amount_real), 2) as sell_amount_total,
      round(sum(coalesce(f.buy_amount_real, 0)), 2) as buy_amount_total,

      round(
        sum(case when f.operativa_code = 'BSG' then f.contribution_amount else 0 end),
        2
      ) as margin_bsg_total,

      round(
        sum(case when f.operativa_code = 'XIAMEN_DIC' then f.contribution_amount else 0 end),
        2
      ) as margin_xiamen_total,

      round(sum(f.contribution_amount), 2) as contribution_total,

      round(
        sum(f.contribution_amount) / nullif(sum(f.sell_amount_real), 0) * 100,
        2
      ) as contribution_pct,

      round(
        sum(case when f.operativa_code = 'XIAMEN_DIC' then f.sell_amount_real else 0 end)
        / nullif(sum(f.sell_amount_real), 0) * 100,
        2
      ) as xiamen_sales_mix_pct,

      round(
        sum(case when f.operativa_code = 'BSG' then f.sell_amount_real else 0 end)
        / nullif(sum(f.sell_amount_real), 0) * 100,
        2
      ) as bsg_sales_mix_pct,

      round(
        sum(case when f.operativa_code = 'XIAMEN_DIC' then f.contribution_amount else 0 end)
        / nullif(sum(case when f.operativa_code = 'XIAMEN_DIC' then f.sell_amount_real else 0 end), 0)
        * 100,
        2
      ) as xiamen_margin_pct,

      round(
        sum(case when f.operativa_code = 'BSG' then f.contribution_amount else 0 end)
        / nullif(sum(case when f.operativa_code = 'BSG' then f.sell_amount_real else 0 end), 0)
        * 100,
        2
      ) as bsg_margin_pct

    from public.mv_fact_operacion_linea_v2 f
    where f.season is not null
      and (p_customer is null or f.customer = p_customer)
      and (p_factory is null or f.factory = p_factory)
    group by f.season
  ),

  with_previous as (
    select
      ss.*,

      lag(ss.season) over (order by ss.season) as previous_season,
      lag(ss.sell_amount_total) over (order by ss.season) as sell_amount_previous,
      lag(ss.contribution_total) over (order by ss.season) as contribution_previous,
      lag(ss.contribution_pct) over (order by ss.season) as contribution_pct_previous

    from season_summary ss
  )

  select
    wp.season,

    wp.po_count,
    wp.line_count,
    wp.customer_count,
    wp.factory_count,
    wp.model_count,
    wp.qty_total,

    wp.sell_amount_total,
    wp.buy_amount_total,
    wp.margin_bsg_total,
    wp.margin_xiamen_total,
    wp.contribution_total,
    wp.contribution_pct,

    wp.xiamen_sales_mix_pct,
    wp.bsg_sales_mix_pct,
    wp.xiamen_margin_pct,
    wp.bsg_margin_pct,

    wp.previous_season,
    wp.sell_amount_previous,
    wp.contribution_previous,
    wp.contribution_pct_previous,

    round(
      (wp.sell_amount_total - wp.sell_amount_previous)
      / nullif(wp.sell_amount_previous, 0) * 100,
      2
    ) as sell_amount_delta_pct,

    round(
      (wp.contribution_total - wp.contribution_previous)
      / nullif(wp.contribution_previous, 0) * 100,
      2
    ) as contribution_delta_pct,

    round(
      wp.contribution_pct - wp.contribution_pct_previous,
      2
    ) as contribution_pct_delta_pp

  from with_previous wp
  where p_season is not null
    and wp.season = p_season;
$$;


ALTER FUNCTION "public"."get_exec_summary_with_delta_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_bsg_margin_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "current_margin_pct" numeric, "comparison_value" numeric, "comparison_margin_pct" numeric, "delta_value" numeric, "delta_pct" numeric, "current_sales" numeric, "comparison_sales" numeric, "current_purchases" numeric, "comparison_purchases" numeric, "current_contribution" numeric, "comparison_contribution" numeric, "current_profitability_pct" numeric, "comparison_profitability_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.margin_base_amount), 0),
            2
        ) as current_value,

        round(
            sum(f.margin_base_amount)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_margin_pct,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as current_sales,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as current_purchases,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as current_contribution,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_profitability_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'BSG'
        and (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

comparison_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.margin_base_amount), 0),
            2
        ) as comparison_value,

        round(
            sum(f.margin_base_amount)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_margin_pct,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as comparison_sales,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as comparison_purchases,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as comparison_contribution,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_profitability_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'BSG'
        and coalesce(
            cardinality(p_comparison_seasons),
            0
        ) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        current_period.current_margin_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_value,
                    0
                )::numeric
            else null::numeric
        end as comparison_value,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_margin_pct
            else null::numeric
        end as comparison_margin_pct,

        coalesce(
            current_period.current_sales,
            0
        )::numeric as current_sales,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_sales,
                    0
                )::numeric
            else null::numeric
        end as comparison_sales,

        coalesce(
            current_period.current_purchases,
            0
        )::numeric as current_purchases,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_purchases,
                    0
                )::numeric
            else null::numeric
        end as comparison_purchases,

        coalesce(
            current_period.current_contribution,
            0
        )::numeric as current_contribution,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_contribution,
                    0
                )::numeric
            else null::numeric
        end as comparison_contribution,

        current_period.current_profitability_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_profitability_pct
            else null::numeric
        end as comparison_profitability_pct

    from current_period

    full outer join comparison_period
        on comparison_period.customer =
           current_period.customer
),

calculated as (
    select
        combined.*,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct

    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,

        calculated.customer,
        calculated.current_value,
        calculated.current_margin_pct,
        calculated.comparison_value,
        calculated.comparison_margin_pct,
        calculated.delta_value,
        calculated.delta_pct,

        calculated.current_sales,
        calculated.comparison_sales,

        calculated.current_purchases,
        calculated.comparison_purchases,

        calculated.current_contribution,
        calculated.comparison_contribution,

        calculated.current_profitability_pct,
        calculated.comparison_profitability_pct

    from calculated
)

select
    ranked.ranking,
    ranked.customer,

    ranked.current_value,
    ranked.current_margin_pct,
    ranked.comparison_value,
    ranked.comparison_margin_pct,
    ranked.delta_value,
    ranked.delta_pct,

    ranked.current_sales,
    ranked.comparison_sales,

    ranked.current_purchases,
    ranked.comparison_purchases,

    ranked.current_contribution,
    ranked.comparison_contribution,

    ranked.current_profitability_pct,
    ranked.comparison_profitability_pct

from ranked

where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)

order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_bsg_margin_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_contribution_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "current_contribution_pct" numeric, "comparison_value" numeric, "comparison_contribution_pct" numeric, "delta_value" numeric, "delta_pct" numeric, "current_sales" numeric, "comparison_sales" numeric, "current_purchases" numeric, "comparison_purchases" numeric, "current_bsg_margin" numeric, "comparison_bsg_margin" numeric, "current_pairs" numeric, "comparison_pairs" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as current_value,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_contribution_pct,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as current_sales,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as current_purchases,

        round(
            coalesce(
                sum(f.margin_base_amount)
                    filter (
                        where f.operativa_code = 'BSG'
                    ),
                0
            ),
            2
        ) as current_bsg_margin,

        coalesce(
            sum(f.qty),
            0
        )::numeric as current_pairs

    from public.mv_fact_operacion_linea_v2 f

    where
        (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

comparison_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as comparison_value,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_contribution_pct,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as comparison_sales,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as comparison_purchases,

        round(
            coalesce(
                sum(f.margin_base_amount)
                    filter (
                        where f.operativa_code = 'BSG'
                    ),
                0
            ),
            2
        ) as comparison_bsg_margin,

        coalesce(
            sum(f.qty),
            0
        )::numeric as comparison_pairs

    from public.mv_fact_operacion_linea_v2 f

    where
        coalesce(
            cardinality(p_comparison_seasons),
            0
        ) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        current_period.current_contribution_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_value,
                    0
                )::numeric
            else null::numeric
        end as comparison_value,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_contribution_pct
            else null::numeric
        end as comparison_contribution_pct,

        coalesce(
            current_period.current_sales,
            0
        )::numeric as current_sales,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_sales,
                    0
                )::numeric
            else null::numeric
        end as comparison_sales,

        coalesce(
            current_period.current_purchases,
            0
        )::numeric as current_purchases,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_purchases,
                    0
                )::numeric
            else null::numeric
        end as comparison_purchases,

        coalesce(
            current_period.current_bsg_margin,
            0
        )::numeric as current_bsg_margin,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_bsg_margin,
                    0
                )::numeric
            else null::numeric
        end as comparison_bsg_margin,

        coalesce(
            current_period.current_pairs,
            0
        )::numeric as current_pairs,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_pairs,
                    0
                )::numeric
            else null::numeric
        end as comparison_pairs

    from current_period

    full outer join comparison_period
        on comparison_period.customer =
           current_period.customer
),

calculated as (
    select
        combined.*,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct

    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,

        calculated.customer,

        calculated.current_value,
        calculated.current_contribution_pct,
        calculated.comparison_value,
        calculated.comparison_contribution_pct,
        calculated.delta_value,
        calculated.delta_pct,

        calculated.current_sales,
        calculated.comparison_sales,

        calculated.current_purchases,
        calculated.comparison_purchases,

        calculated.current_bsg_margin,
        calculated.comparison_bsg_margin,

        calculated.current_pairs,
        calculated.comparison_pairs

    from calculated
)

select
    ranked.ranking,
    ranked.customer,

    ranked.current_value,
    ranked.current_contribution_pct,
    ranked.comparison_value,
    ranked.comparison_contribution_pct,
    ranked.delta_value,
    ranked.delta_pct,

    ranked.current_sales,
    ranked.comparison_sales,

    ranked.current_purchases,
    ranked.comparison_purchases,

    ranked.current_bsg_margin,
    ranked.comparison_bsg_margin,

    ranked.current_pairs,
    ranked.comparison_pairs

from ranked

where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)

order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_contribution_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_models_v1"("p_customer" "text", "p_season" "text", "p_metric" "text") RETURNS TABLE("modelo_id" "uuid", "style" "text", "pairs" numeric, "value" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog'
    AS $$
BEGIN
    -- ValidaciÃ³n de cliente
    IF p_customer IS NULL OR btrim(p_customer) = '' THEN
        RAISE EXCEPTION 'p_customer es obligatorio'
            USING ERRCODE = '22023';
    END IF;

    -- ValidaciÃ³n de campaÃ±a
    IF p_season IS NULL OR btrim(p_season) = '' THEN
        RAISE EXCEPTION 'p_season es obligatorio'
            USING ERRCODE = '22023';
    END IF;

    -- ValidaciÃ³n de mÃ©trica
    IF p_metric IS NULL
       OR p_metric NOT IN ('sales', 'purchases') THEN
        RAISE EXCEPTION
            'p_metric debe ser sales o purchases'
            USING ERRCODE = '22023';
    END IF;

    /*
     * ComprobaciÃ³n de integridad.
     *
     * SALES:
     *   todas las operativas.
     *
     * PURCHASES:
     *   Ãºnicamente operativa BSG, reproduciendo el alcance de
     *   get_explorer_purchases_by_customer_v1.
     *
     * Si existe una lÃ­nea sin modelo_id o cuyo modelo ya no existe
     * en el catÃ¡logo maestro, no devolvemos resultados parciales.
     */
    IF EXISTS (
        SELECT 1
        FROM public.mv_fact_operacion_linea_v2 AS f
        LEFT JOIN public.modelos AS m
            ON m.id = f.modelo_id
        WHERE f.customer = p_customer
          AND f.season = p_season
          AND (
              p_metric = 'sales'
              OR f.operativa_code = 'BSG'
          )
          AND (
              f.modelo_id IS NULL
              OR m.id IS NULL
          )
    ) THEN
        RAISE EXCEPTION
            'Existen lÃ­neas sin modelo vÃ¡lido para cliente %, campaÃ±a % y mÃ©trica %',
            p_customer,
            p_season,
            p_metric
            USING ERRCODE = '23503';
    END IF;

    RETURN QUERY
    WITH totals AS (
        SELECT
            f.modelo_id,

            sum(f.qty::numeric) AS pairs,

            sum(
                CASE p_metric
                    WHEN 'sales'
                        THEN f.sell_amount_real::numeric
                    WHEN 'purchases'
                        THEN f.buy_amount_real::numeric
                END
            ) AS value

        FROM public.mv_fact_operacion_linea_v2 AS f

        WHERE f.customer = p_customer
          AND f.season = p_season
          AND (
              p_metric = 'sales'
              OR f.operativa_code = 'BSG'
          )

        GROUP BY
            f.modelo_id
    )

    SELECT
        t.modelo_id,
        m.style::text AS style,
        t.pairs,
        t.value

    FROM totals AS t

    JOIN public.modelos AS m
        ON m.id = t.modelo_id

    ORDER BY
        t.value DESC NULLS LAST,
        t.modelo_id ASC;

END;
$$;


ALTER FUNCTION "public"."get_explorer_models_v1"("p_customer" "text", "p_season" "text", "p_metric" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_profitability_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "comparison_value" numeric, "delta_value" numeric, "delta_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,
        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_value
    from public.mv_fact_operacion_linea_v2 f
    where
        (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''
    group by f.customer
),

comparison_period as (
    select
        f.customer,
        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_value
    from public.mv_fact_operacion_linea_v2 f
    where
        coalesce(cardinality(p_comparison_seasons), 0) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''
    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        case
            when coalesce(cardinality(p_comparison_seasons), 0) > 0
                then comparison_period.comparison_value
            else null::numeric
        end as comparison_value
    from current_period
    full outer join comparison_period
        on comparison_period.customer = current_period.customer
),

calculated as (
    select
        combined.customer,
        combined.current_value,
        combined.comparison_value,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct
    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,
        calculated.customer,
        calculated.current_value,
        calculated.comparison_value,
        calculated.delta_value,
        calculated.delta_pct
    from calculated
)

select
    ranked.ranking,
    ranked.customer,
    ranked.current_value,
    ranked.comparison_value,
    ranked.delta_value,
    ranked.delta_pct
from ranked
where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)
order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_profitability_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_purchases_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "comparison_value" numeric, "delta_value" numeric, "delta_pct" numeric, "current_avg_purchase_price" numeric, "comparison_avg_purchase_price" numeric, "current_pairs" numeric, "comparison_pairs" numeric, "current_orders" bigint, "comparison_orders" bigint, "current_sales" numeric, "comparison_sales" numeric, "current_bsg_margin" numeric, "comparison_bsg_margin" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as current_value,

        round(
            coalesce(sum(f.buy_amount_real), 0)
            / nullif(sum(f.qty), 0),
            2
        ) as current_avg_purchase_price,

        coalesce(
            sum(f.qty),
            0
        )::numeric as current_pairs,

        count(distinct f.po_id)::bigint as current_orders,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as current_sales,

        round(
            coalesce(sum(f.margin_base_amount), 0),
            2
        ) as current_bsg_margin

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'BSG'
        and (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

comparison_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.buy_amount_real), 0),
            2
        ) as comparison_value,

        round(
            coalesce(sum(f.buy_amount_real), 0)
            / nullif(sum(f.qty), 0),
            2
        ) as comparison_avg_purchase_price,

        coalesce(
            sum(f.qty),
            0
        )::numeric as comparison_pairs,

        count(distinct f.po_id)::bigint as comparison_orders,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as comparison_sales,

        round(
            coalesce(sum(f.margin_base_amount), 0),
            2
        ) as comparison_bsg_margin

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'BSG'
        and coalesce(
            cardinality(p_comparison_seasons),
            0
        ) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_value,
                    0
                )::numeric
            else null::numeric
        end as comparison_value,

        current_period.current_avg_purchase_price,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_avg_purchase_price
            else null::numeric
        end as comparison_avg_purchase_price,

        coalesce(
            current_period.current_pairs,
            0
        )::numeric as current_pairs,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_pairs,
                    0
                )::numeric
            else null::numeric
        end as comparison_pairs,

        coalesce(
            current_period.current_orders,
            0
        )::bigint as current_orders,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_orders,
                    0
                )::bigint
            else null::bigint
        end as comparison_orders,

        coalesce(
            current_period.current_sales,
            0
        )::numeric as current_sales,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_sales,
                    0
                )::numeric
            else null::numeric
        end as comparison_sales,

        coalesce(
            current_period.current_bsg_margin,
            0
        )::numeric as current_bsg_margin,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_bsg_margin,
                    0
                )::numeric
            else null::numeric
        end as comparison_bsg_margin

    from current_period

    full outer join comparison_period
        on comparison_period.customer =
           current_period.customer
),

calculated as (
    select
        combined.*,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct

    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,

        calculated.customer,
        calculated.current_value,
        calculated.comparison_value,
        calculated.delta_value,
        calculated.delta_pct,

        calculated.current_avg_purchase_price,
        calculated.comparison_avg_purchase_price,

        calculated.current_pairs,
        calculated.comparison_pairs,

        calculated.current_orders,
        calculated.comparison_orders,

        calculated.current_sales,
        calculated.comparison_sales,

        calculated.current_bsg_margin,
        calculated.comparison_bsg_margin

    from calculated
)

select
    ranked.ranking,
    ranked.customer,

    ranked.current_value,
    ranked.comparison_value,
    ranked.delta_value,
    ranked.delta_pct,

    ranked.current_avg_purchase_price,
    ranked.comparison_avg_purchase_price,

    ranked.current_pairs,
    ranked.comparison_pairs,

    ranked.current_orders,
    ranked.comparison_orders,

    ranked.current_sales,
    ranked.comparison_sales,

    ranked.current_bsg_margin,
    ranked.comparison_bsg_margin

from ranked

where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)

order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_purchases_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_sales_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "comparison_value" numeric, "delta_value" numeric, "delta_pct" numeric, "current_pairs" numeric, "comparison_pairs" numeric, "current_orders" bigint, "comparison_orders" bigint, "current_avg_price" numeric, "comparison_avg_price" numeric, "current_margin_pct" numeric, "comparison_margin_pct" numeric, "current_profitability_pct" numeric, "comparison_profitability_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as current_value,

        coalesce(
            sum(f.qty),
            0
        )::numeric as current_pairs,

        count(distinct f.po_id)::bigint as current_orders,

        round(
            coalesce(sum(f.sell_amount_real), 0)
            / nullif(sum(f.qty), 0),
            2
        ) as current_avg_price,

        round(
            sum(f.margin_base_amount)
                filter (
                    where f.operativa_code = 'BSG'
                )
            / nullif(
                sum(f.sell_amount_real)
                    filter (
                        where f.operativa_code = 'BSG'
                    ),
                0
            )
            * 100,
            2
        ) as current_margin_pct,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_profitability_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

comparison_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.sell_amount_real), 0),
            2
        ) as comparison_value,

        coalesce(
            sum(f.qty),
            0
        )::numeric as comparison_pairs,

        count(distinct f.po_id)::bigint as comparison_orders,

        round(
            coalesce(sum(f.sell_amount_real), 0)
            / nullif(sum(f.qty), 0),
            2
        ) as comparison_avg_price,

        round(
            sum(f.margin_base_amount)
                filter (
                    where f.operativa_code = 'BSG'
                )
            / nullif(
                sum(f.sell_amount_real)
                    filter (
                        where f.operativa_code = 'BSG'
                    ),
                0
            )
            * 100,
            2
        ) as comparison_margin_pct,

        round(
            coalesce(sum(f.contribution_amount), 0)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_profitability_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        coalesce(
            cardinality(p_comparison_seasons),
            0
        ) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_value,
                    0
                )::numeric
            else null::numeric
        end as comparison_value,

        coalesce(
            current_period.current_pairs,
            0
        )::numeric as current_pairs,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_pairs,
                    0
                )::numeric
            else null::numeric
        end as comparison_pairs,

        coalesce(
            current_period.current_orders,
            0
        )::bigint as current_orders,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_orders,
                    0
                )::bigint
            else null::bigint
        end as comparison_orders,

        current_period.current_avg_price,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_avg_price
            else null::numeric
        end as comparison_avg_price,

        current_period.current_margin_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_margin_pct
            else null::numeric
        end as comparison_margin_pct,

        current_period.current_profitability_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_profitability_pct
            else null::numeric
        end as comparison_profitability_pct

    from current_period

    full outer join comparison_period
        on comparison_period.customer =
           current_period.customer
),

calculated as (
    select
        combined.*,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct

    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,

        calculated.customer,
        calculated.current_value,
        calculated.comparison_value,
        calculated.delta_value,
        calculated.delta_pct,

        calculated.current_pairs,
        calculated.comparison_pairs,

        calculated.current_orders,
        calculated.comparison_orders,

        calculated.current_avg_price,
        calculated.comparison_avg_price,

        calculated.current_margin_pct,
        calculated.comparison_margin_pct,

        calculated.current_profitability_pct,
        calculated.comparison_profitability_pct

    from calculated
)

select
    ranked.ranking,
    ranked.customer,

    ranked.current_value,
    ranked.comparison_value,
    ranked.delta_value,
    ranked.delta_pct,

    ranked.current_pairs,
    ranked.comparison_pairs,

    ranked.current_orders,
    ranked.comparison_orders,

    ranked.current_avg_price,
    ranked.comparison_avg_price,

    ranked.current_margin_pct,
    ranked.comparison_margin_pct,

    ranked.current_profitability_pct,
    ranked.comparison_profitability_pct

from ranked

where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)

order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_sales_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_sales_evolution_v1"("p_customer" "text" DEFAULT NULL::"text") RETURNS TABLE("season" "text", "display_name" "text", "sequence_prefix" integer, "value" numeric)
    LANGUAGE "sql" STABLE
    AS $$

select
    s.season,
    s.display_name,
    s.sequence_prefix,

    round(
        coalesce(sum(f.sell_amount_real), 0),
        2
    ) as value

from public.mv_fact_operacion_linea_v2 f

join public.vw_commercial_seasons_v1 s
    on s.season = f.season

where
    s.season_type is not null
    and (
        p_customer is null
        or f.customer = p_customer
    )

group by
    s.season,
    s.display_name,
    s.sequence_prefix

order by
    s.sequence_prefix asc;

$$;


ALTER FUNCTION "public"."get_explorer_sales_evolution_v1"("p_customer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_explorer_xiamen_commission_by_customer_v1"("p_seasons" "text"[] DEFAULT NULL::"text"[], "p_comparison_seasons" "text"[] DEFAULT NULL::"text"[], "p_include_all" boolean DEFAULT false, "p_limit" integer DEFAULT 20) RETURNS TABLE("ranking" bigint, "customer" "text", "current_value" numeric, "current_commission_pct" numeric, "comparison_value" numeric, "comparison_commission_pct" numeric, "delta_value" numeric, "delta_pct" numeric)
    LANGUAGE "sql" STABLE
    AS $$

with current_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as current_value,

        round(
            sum(f.contribution_amount)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as current_commission_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'XIAMEN_DIC'
        and (
            p_include_all = true
            or (
                p_seasons is not null
                and f.season = any(p_seasons)
            )
        )
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

comparison_period as (
    select
        f.customer,

        round(
            coalesce(sum(f.contribution_amount), 0),
            2
        ) as comparison_value,

        round(
            sum(f.contribution_amount)
            / nullif(sum(f.sell_amount_real), 0)
            * 100,
            2
        ) as comparison_commission_pct

    from public.mv_fact_operacion_linea_v2 f

    where
        f.operativa_code = 'XIAMEN_DIC'
        and coalesce(
            cardinality(p_comparison_seasons),
            0
        ) > 0
        and f.season = any(p_comparison_seasons)
        and f.customer is not null
        and btrim(f.customer) <> ''

    group by f.customer
),

combined as (
    select
        coalesce(
            current_period.customer,
            comparison_period.customer
        ) as customer,

        coalesce(
            current_period.current_value,
            0
        )::numeric as current_value,

        current_period.current_commission_pct,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then coalesce(
                    comparison_period.comparison_value,
                    0
                )::numeric
            else null::numeric
        end as comparison_value,

        case
            when coalesce(
                cardinality(p_comparison_seasons),
                0
            ) > 0
                then comparison_period.comparison_commission_pct
            else null::numeric
        end as comparison_commission_pct

    from current_period

    full outer join comparison_period
        on comparison_period.customer = current_period.customer
),

calculated as (
    select
        combined.customer,
        combined.current_value,
        combined.current_commission_pct,
        combined.comparison_value,
        combined.comparison_commission_pct,

        case
            when combined.comparison_value is null
                then null::numeric
            else round(
                combined.current_value
                - combined.comparison_value,
                2
            )
        end as delta_value,

        case
            when combined.comparison_value is null
                or combined.comparison_value <= 0
                then null::numeric
            else round(
                (
                    combined.current_value
                    - combined.comparison_value
                )
                / combined.comparison_value
                * 100,
                2
            )
        end as delta_pct

    from combined
),

ranked as (
    select
        row_number() over (
            order by
                calculated.current_value desc,
                calculated.customer asc
        ) as ranking,

        calculated.customer,
        calculated.current_value,
        calculated.current_commission_pct,
        calculated.comparison_value,
        calculated.comparison_commission_pct,
        calculated.delta_value,
        calculated.delta_pct

    from calculated
)

select
    ranked.ranking,
    ranked.customer,
    ranked.current_value,
    ranked.current_commission_pct,
    ranked.comparison_value,
    ranked.comparison_commission_pct,
    ranked.delta_value,
    ranked.delta_pct

from ranked

where ranked.ranking <= greatest(
    coalesce(p_limit, 20),
    1
)

order by ranked.ranking;

$$;


ALTER FUNCTION "public"."get_explorer_xiamen_commission_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_situation_pivot"("p_metric" "text" DEFAULT 'sales'::"text", "p_dimension" "text" DEFAULT 'customer'::"text", "p_season" "text" DEFAULT NULL::"text", "p_customer" "text" DEFAULT NULL::"text", "p_factory" "text" DEFAULT NULL::"text", "p_operativa" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 20) RETURNS TABLE("label" "text", "value" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
  metric_expr text;
  dimension_expr text;
  sql text;
begin
  metric_expr := case p_metric
    when 'sales' then 'sum(coalesce(sell_amount_real, 0))'
    when 'contribution' then 'sum(coalesce(contribution_amount, 0))'
    when 'qty' then 'sum(coalesce(qty_total, 0))'
    else 'sum(coalesce(sell_amount_real, 0))'
  end;

  dimension_expr := case p_dimension
    when 'customer' then 'customer'
    when 'factory' then 'factory'
    when 'season' then 'season'
    when 'operativa' then 'operativa_code'
    else 'customer'
  end;

  sql := format(
    'select %1$s::text as label, %2$s::numeric as value
     from mv_fact_operacion_linea
     where (%3$L is null or season = %3$L)
       and (%4$L is null or customer = %4$L)
       and (%5$L is null or factory = %5$L)
       and (%6$L is null or operativa_code = %6$L)
       and %1$s is not null
     group by %1$s
     order by value desc
     limit %7$s',
    dimension_expr,
    metric_expr,
    p_season,
    p_customer,
    p_factory,
    p_operativa,
    greatest(1, least(coalesce(p_limit, 20), 50))
  );

  return query execute sql;
end;
$_$;


ALTER FUNCTION "public"."get_situation_pivot"("p_metric" "text", "p_dimension" "text", "p_season" "text", "p_customer" "text", "p_factory" "text", "p_operativa" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_situation_pivot_v2"("p_metric" "text" DEFAULT 'sales'::"text", "p_dimension" "text" DEFAULT 'customer'::"text", "p_seasons" "text"[] DEFAULT NULL::"text"[], "p_customers" "text"[] DEFAULT NULL::"text"[], "p_factories" "text"[] DEFAULT NULL::"text"[], "p_operativas" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 20) RETURNS TABLE("label" "text", "value" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
  metric_expr text;
  dimension_expr text;
  sql text;
begin
  metric_expr := case p_metric
    when 'sales' then 'sum(coalesce(sell_amount_real, 0))'
    when 'contribution' then 'sum(coalesce(contribution_amount, 0))'
    when 'qty' then 'sum(coalesce(qty, 0))'
    else 'sum(coalesce(sell_amount_real, 0))'
  end;

  dimension_expr := case p_dimension
    when 'customer' then 'customer'
    when 'factory' then 'factory'
    when 'season' then 'season'
    when 'operativa' then 'operativa_code'
    else 'customer'
  end;

  sql := format(
    'select %1$s::text as label, %2$s::numeric as value
     from mv_fact_operacion_linea_v2
     where %1$s is not null
       and ($1 is null or season = any($1))
       and ($2 is null or customer = any($2))
       and ($3 is null or factory = any($3))
       and ($4 is null or operativa_code = any($4))
     group by %1$s
     order by value desc
     limit %3$s',
    dimension_expr,
    metric_expr,
    greatest(1, least(coalesce(p_limit, 20), 50))
  );

  return query execute sql
  using p_seasons, p_customers, p_factories, p_operativas;
end;
$_$;


ALTER FUNCTION "public"."get_situation_pivot_v2"("p_metric" "text", "p_dimension" "text", "p_seasons" "text"[], "p_customers" "text"[], "p_factories" "text"[], "p_operativas" "text"[], "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."obtener_pos_con_alertas_pendientes"() RETURNS TABLE("id" "uuid", "po" "text", "supplier" "text", "customer" "text", "factory" "text", "lineas" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    resultado RECORD;
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.po,
        p.supplier,
        p.customer,
        p.factory,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', lp.id,
                    'style', lp.style,
                    'color', lp.color,
                    'shipping_date', lp.shipping_date,
                    'finish_date', lp.finish_date,
                    'etd_pi', lp.etd_pi,
                    'trial_upper', lp.trial_upper,
                    'trial_lasting', lp.trial_lasting,
                    'lasting', lp.lasting,
                    'inspection_date', lp.inspection_date,
                    'muestras', (
                        SELECT COALESCE(JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', m.id,
                                'tipo_muestra', m.tipo_muestra,
                                'round', m.round,
                                'fecha_muestra', m.fecha_muestra,
                                'fecha_estimada', m.fecha_estimada
                            )
                        ), '[]'::JSONB)
                        FROM muestras m
                        WHERE m.linea_pedido_id = lp.id
                    )
                )
            ), '[]'::JSONB
        )
    FROM pos p
    LEFT JOIN lineas_pedido lp ON p.id = lp.po_id
    GROUP BY p.id, p.po, p.supplier, p.customer, p.factory;
END;
$$;


ALTER FUNCTION "public"."obtener_pos_con_alertas_pendientes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_analytics_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  refresh materialized view mv_exec_cross_module_risk_fast;
  refresh materialized view mv_exec_cross_module_correlations_fast;
  refresh materialized view mv_exec_morning_brief_fast;
end;
$$;


ALTER FUNCTION "public"."refresh_analytics_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_analytics_refresh"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r record;
  refreshed_count int := 0;
  refreshed_views text[] := '{}';
  started_at timestamptz := now();
begin
  for r in
    select schemaname, matviewname
    from pg_matviews
    where schemaname = 'public'
    order by matviewname
  loop
    execute format(
      'refresh materialized view %I.%I',
      r.schemaname,
      r.matviewname
    );

    refreshed_count := refreshed_count + 1;
    refreshed_views := array_append(refreshed_views, r.matviewname);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'refreshed_count', refreshed_count,
    'refreshed_views', refreshed_views,
    'started_at', started_at,
    'finished_at', now()
  );
end;
$$;


ALTER FUNCTION "public"."run_analytics_refresh"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_master_sync_pipeline"("p_mode" "text" DEFAULT 'development'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_models_created int := 0;
  v_variants_upserted int := 0;
  v_modelos_backfilled int := 0;
  v_variantes_backfilled int := 0;
  v_prices_upserted int := 0;
  v_snapshots_applied int := 0;
  v_total_lineas int := 0;
  v_con_modelo int := 0;
  v_con_variante int := 0;
  v_con_snapshot int := 0;
  v_sin_snapshot int := 0;
begin
  if p_mode not in ('development', 'operational') then
    raise exception 'Invalid mode %. Use development or operational', p_mode;
  end if;

  with inserted as (
    insert into public.modelos (style, supplier, customer, factory, reference, description)
    select x.style, x.supplier, x.customer, x.factory, x.style,
           'Auto-created from POs (master sync)'
    from (
      select distinct on (lower(btrim(lp.style)))
        btrim(lp.style) as style,
        p.supplier,
        p.customer,
        p.factory,
        coalesce(p.po_date, p.created_at::date) as base_date
      from public.lineas_pedido lp
      join public.pos p on p.id = lp.po_id
      where coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
        and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
        and lp.style is not null
        and btrim(lp.style) <> ''
      order by lower(btrim(lp.style)), coalesce(p.po_date, p.created_at::date) desc
    ) x
    where not exists (
      select 1 from public.modelos m
      where lower(btrim(m.style)) = lower(btrim(x.style))
    )
    returning id
  )
  select count(*) into v_models_created from inserted;

  with updated as (
    update public.lineas_pedido lp
    set modelo_id = m.id
    from public.modelos m
    join public.pos p on true
    where p.id = lp.po_id
      and coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
      and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
      and lp.modelo_id is null
      and lp.style is not null
      and btrim(lp.style) <> ''
      and lower(btrim(m.style)) = lower(btrim(lp.style))
    returning lp.id
  )
  select count(*) into v_modelos_backfilled from updated;

  with upserted as (
    insert into public.modelo_variantes (
      modelo_id, season, color, factory, reference, notes, status
    )
    select
      x.modelo_id,
      x.season,
      x.color,
      x.factory,
      x.reference,
      'Auto-created/updated from POs (master sync)',
      'activo'
    from (
      select distinct on (
        lp.modelo_id,
        p.season,
        lower(btrim(lp.color)),
        lower(btrim(coalesce(nullif(lp.reference, ''), lp.style)))
      )
        lp.modelo_id,
        p.season,
        btrim(lp.color) as color,
        nullif(btrim(p.factory), '') as factory,
        btrim(coalesce(nullif(lp.reference, ''), lp.style)) as reference,
        coalesce(p.po_date, p.created_at::date, current_date) as po_date_norm
      from public.lineas_pedido lp
      join public.pos p on p.id = lp.po_id
      where coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
        and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
        and lp.modelo_id is not null
        and p.season is not null
        and lp.color is not null
        and btrim(lp.color) <> ''
        and lp.style is not null
        and btrim(lp.style) <> ''
      order by
        lp.modelo_id,
        p.season,
        lower(btrim(lp.color)),
        lower(btrim(coalesce(nullif(lp.reference, ''), lp.style))),
        coalesce(p.po_date, p.created_at::date, current_date) desc
    ) x
    on conflict (modelo_id, season, color, reference_key)
    do update set
      factory = coalesce(excluded.factory, public.modelo_variantes.factory),
      reference = coalesce(excluded.reference, public.modelo_variantes.reference),
      notes = excluded.notes,
      status = excluded.status,
      updated_at = now()
    returning id
  )
  select count(*) into v_variants_upserted from upserted;

  with updated as (
    update public.lineas_pedido lp
    set variante_id = v.id
    from public.pos p, public.modelo_variantes v
    where lp.po_id = p.id
      and coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
      and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
      and lp.variante_id is null
      and lp.modelo_id is not null
      and lp.color is not null
      and btrim(lp.color) <> ''
      and lp.style is not null
      and btrim(lp.style) <> ''
      and v.modelo_id = lp.modelo_id
      and v.season = p.season
      and lower(btrim(v.color)) = lower(btrim(lp.color))
      and lower(btrim(v.reference)) =
          lower(btrim(coalesce(nullif(lp.reference, ''), lp.style)))
    returning lp.id
  )
  select count(*) into v_variantes_backfilled from updated;

  with upserted as (
    insert into public.modelo_precios (
      modelo_id,
      variante_id,
      season,
      currency,
      buy_price,
      sell_price,
      valid_from,
      category,
      size_run,
      channel,
      notes
    )
    select
      x.modelo_id,
      x.variante_id,
      x.season,
      'USD',
      x.buy_price,
      x.sell_price,
      x.valid_from,
      x.category,
      x.size_run,
      x.channel,
      'Imported from POs (master sync latest po_date per variante+season+category+size_run+channel)'
    from (
      select distinct on (
        lp.variante_id,
        p.season,
        coalesce(nullif(btrim(lp.category), ''), ''),
        coalesce(nullif(btrim(lp.size_run), ''), ''),
        coalesce(nullif(btrim(lp.channel), ''), '')
      )
        lp.modelo_id,
        lp.variante_id,
        p.season,
        lp.price as buy_price,
        lp.price_selling as sell_price,
        coalesce(p.po_date, p.created_at::date, current_date) as valid_from,
        coalesce(nullif(btrim(lp.category), ''), '') as category,
        coalesce(nullif(btrim(lp.size_run), ''), '') as size_run,
        coalesce(nullif(btrim(lp.channel), ''), '') as channel
      from public.lineas_pedido lp
      join public.pos p on p.id = lp.po_id
      where coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
        and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
        and lp.variante_id is not null
        and lp.modelo_id is not null
        and lp.price is not null
      order by
        lp.variante_id,
        p.season,
        coalesce(nullif(btrim(lp.category), ''), ''),
        coalesce(nullif(btrim(lp.size_run), ''), ''),
        coalesce(nullif(btrim(lp.channel), ''), ''),
        coalesce(p.po_date, p.created_at::date, current_date) desc
    ) x
    on conflict (
      variante_id,
      season,
      valid_from,
      category,
      size_run,
      channel
    )
    where variante_id is not null
    do update set
      currency = excluded.currency,
      buy_price = excluded.buy_price,
      sell_price = excluded.sell_price,
      notes = excluded.notes,
      updated_at = now()
    returning id
  )
  select count(*) into v_prices_upserted from upserted;

  if p_mode = 'development' then
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
          and coalesce(mp.category, '') = coalesce(nullif(btrim(lp2.category), ''), '')
          and coalesce(mp.size_run, '') = coalesce(nullif(btrim(lp2.size_run), ''), '')
          and coalesce(mp.channel, '') = coalesce(nullif(btrim(lp2.channel), ''), '')
        order by mp.valid_from desc
        limit 1
      ) mp2 on true
      where coalesce(lp2.estado, 'ACTIVA') = 'ACTIVA'
        and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
        and lp2.variante_id is not null
        and lp2.master_price_id_used is null
    ),
    updated as (
      update public.lineas_pedido lp
      set
        master_buy_price_used = mp.buy_price,
        master_sell_price_used = mp.sell_price,
        master_currency_used = mp.currency,
        master_valid_from_used = mp.valid_from,
        master_price_id_used = mp.id,
        master_price_source = coalesce(lp.master_price_source, 'import_season_latest')
      from pick
      join public.modelo_precios mp on mp.id = pick.master_price_id
      where lp.id = pick.linea_id
      returning lp.id
    )
    select count(*) into v_snapshots_applied from updated;
  else
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
          and coalesce(mp.category, '') = coalesce(nullif(btrim(lp2.category), ''), '')
          and coalesce(mp.size_run, '') = coalesce(nullif(btrim(lp2.size_run), ''), '')
          and coalesce(mp.channel, '') = coalesce(nullif(btrim(lp2.channel), ''), '')
        order by mp.valid_from desc
        limit 1
      ) mp2 on true
      where coalesce(lp2.estado, 'ACTIVA') = 'ACTIVA'
        and coalesce(p.estado, 'ACTIVO') = 'ACTIVO'
        and lp2.variante_id is not null
        and lp2.master_price_id_used is null
    ),
    updated as (
      update public.lineas_pedido lp
      set
        master_buy_price_used = mp.buy_price,
        master_sell_price_used = mp.sell_price,
        master_currency_used = mp.currency,
        master_valid_from_used = mp.valid_from,
        master_price_id_used = mp.id,
        master_price_source = coalesce(lp.master_price_source, 'operativo_by_date')
      from pick
      join public.modelo_precios mp on mp.id = pick.master_price_id
      where lp.id = pick.linea_id
      returning lp.id
    )
    select count(*) into v_snapshots_applied from updated;
  end if;

  select
    count(*),
    count(*) filter (where lp.modelo_id is not null),
    count(*) filter (where lp.variante_id is not null),
    count(*) filter (where lp.master_price_id_used is not null),
    count(*) filter (where lp.master_price_id_used is null)
  into
    v_total_lineas,
    v_con_modelo,
    v_con_variante,
    v_con_snapshot,
    v_sin_snapshot
  from public.lineas_pedido lp
  join public.pos p on p.id = lp.po_id
  where coalesce(lp.estado, 'ACTIVA') = 'ACTIVA'
    and coalesce(p.estado, 'ACTIVO') = 'ACTIVO';

  return jsonb_build_object(
    'ok', true,
    'mode', p_mode,
    'models_created', v_models_created,
    'variants_upserted', v_variants_upserted,
    'lineas_modelo_backfilled', v_modelos_backfilled,
    'lineas_variante_backfilled', v_variantes_backfilled,
    'prices_upserted', v_prices_upserted,
    'snapshots_applied', v_snapshots_applied,
    'verification', jsonb_build_object(
      'total_lineas', v_total_lineas,
      'con_modelo', v_con_modelo,
      'con_variante', v_con_variante,
      'con_snapshot', v_con_snapshot,
      'sin_snapshot', v_sin_snapshot
    )
  );
end;
$$;


ALTER FUNCTION "public"."run_master_sync_pipeline"("p_mode" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_executive_actions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();

  if new.status in ('RESOLVED', 'DISMISSED') and old.status is distinct from new.status then
    new.resolved_at = coalesce(new.resolved_at, now());
  end if;

  if new.status not in ('RESOLVED', 'DISMISSED') then
    new.resolved_at = null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_executive_actions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_analytics_v2"("p_source" "text" DEFAULT 'manual'::"text", "p_requested_by" "text" DEFAULT NULL::"text") RETURNS TABLE("ok" boolean, "status" "text", "synced_at" timestamp with time zone, "duration_ms" integer, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_started_at timestamptz;
    v_finished_at timestamptz;
    v_duration_ms integer;
    v_error_message text;
BEGIN
    /*
     * Evita dos reconstrucciones simultÃ¡neas.
     * La segunda llamada esperarÃ¡ hasta que termine la primera.
     */
    PERFORM pg_advisory_xact_lock(
        hashtext(
            'production_tracker_analytics_sync_v2'
        )
    );

    v_started_at := clock_timestamp();

    INSERT INTO public.analytics_sync_status (
        sync_key,
        status,
        last_attempt_at,
        last_source,
        last_requested_by,
        last_error,
        updated_at
    )
    VALUES (
        'main',
        'RUNNING',
        v_started_at,
        NULLIF(BTRIM(p_source), ''),
        NULLIF(BTRIM(p_requested_by), ''),
        NULL,
        v_started_at
    )
    ON CONFLICT (sync_key)
    DO UPDATE SET
        status = 'RUNNING',
        last_attempt_at = EXCLUDED.last_attempt_at,
        last_source = EXCLUDED.last_source,
        last_requested_by =
            EXCLUDED.last_requested_by,
        last_error = NULL,
        updated_at = EXCLUDED.updated_at;

    BEGIN
        REFRESH MATERIALIZED VIEW
            public.mv_fact_operacion_linea_v2;

        v_finished_at := clock_timestamp();

        v_duration_ms := FLOOR(
            EXTRACT(
                EPOCH FROM (
                    v_finished_at - v_started_at
                )
            ) * 1000
        )::integer;

        UPDATE public.analytics_sync_status
        SET
            status = 'SUCCESS',
            last_success_at = v_finished_at,
            last_error = NULL,
            last_duration_ms = v_duration_ms,
            updated_at = v_finished_at
        WHERE sync_key = 'main';

        RETURN QUERY
        SELECT
            true,
            'SUCCESS'::text,
            v_finished_at,
            v_duration_ms,
            NULL::text;

        RETURN;

    EXCEPTION
        WHEN OTHERS THEN
            v_finished_at := clock_timestamp();
            v_error_message := SQLERRM;

            v_duration_ms := FLOOR(
                EXTRACT(
                    EPOCH FROM (
                        v_finished_at - v_started_at
                    )
                ) * 1000
            )::integer;

            UPDATE public.analytics_sync_status
            SET
                status = 'FAILED',
                last_failure_at = v_finished_at,
                last_error = v_error_message,
                last_duration_ms = v_duration_ms,
                updated_at = v_finished_at
            WHERE sync_key = 'main';

            /*
             * No relanzamos el error.
             *
             * AsÃ­ la operaciÃ³n de negocio puede terminar
             * correctamente y el fallo queda registrado para
             * reintento manual.
             */
            RETURN QUERY
            SELECT
                false,
                'FAILED'::text,
                NULL::timestamptz,
                v_duration_ms,
                v_error_message;

            RETURN;
    END;
END;
$$;


ALTER FUNCTION "public"."sync_analytics_v2"("p_source" "text", "p_requested_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_exec_actions_from_risk"() RETURNS TABLE("created_count" integer, "updated_count" integer, "reopened_count" integer, "escalated_count" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_created_count integer := 0;
  v_updated_count integer := 0;
  v_reopened_count integer := 0;
  v_escalated_count integer := 0;
begin
  /*
    1. Crear acciones nuevas desde riesgos CRITICAL / WARNING
  */
  with source_rows as (
    select
      'cross_module_risk:' || customer as action_key,
      customer,
      alert_level,
      executive_summary,
      recommended_action,
      jsonb_build_object(
        'cross_module_risk_score', cross_module_risk_score,
        'cross_module_risk_level', cross_module_risk_level,
        'primary_driver', primary_driver,
        'alert_level', alert_level,
        'alert_type', alert_type,
        'alert_reason', alert_reason,
        'commercial_risk_points', commercial_risk_points,
        'production_risk_points', production_risk_points,
        'margin_risk_points', margin_risk_points,
        'development_risk_points', development_risk_points,
        'concentration_risk_points', concentration_risk_points,
        'contextual_business_profile', contextual_business_profile,
        'contextual_business_score', contextual_business_score,
        'customer_friction_score', customer_friction_score,
        'health_signal', health_signal,
        'volume_signal', volume_signal,
        'qty_growth_pct', qty_growth_pct,
        'sell_growth_pct', sell_growth_pct,
        'score_model', score_model,
        'po_count', po_count,
        'line_count', line_count,
        'factory_count', factory_count,
        'model_count', model_count,
        'qty_total', qty_total,
        'sell_amount_total', sell_amount_total,
        'contribution_total', contribution_total,
        'contribution_pct', contribution_pct,
        'production_late_rate_pct', production_late_rate_pct,
        'avg_delay_production_days', avg_delay_production_days,
        'max_delay_production_days', max_delay_production_days,
        'executive_tier', executive_tier,
        'negotiation_score', negotiation_score,
        'negotiation_profile', negotiation_profile,
        'avg_revisions', avg_revisions,
        'avg_days_to_order', avg_days_to_order
      ) as metadata
    from vw_exec_cross_module_risk_v1
    where alert_level in ('CRITICAL', 'WARNING')
      and customer is not null
  ),
  inserted as (
    insert into executive_actions (
      action_key,
      source_view,
      source_type,
      source_entity_type,
      source_entity_id,
      customer,
      module,
      priority,
      status,
      title,
      description,
      recommended_action,
      metadata,
      first_detected_at,
      last_seen_at
    )
    select
      sr.action_key,
      'vw_exec_cross_module_risk_v1',
      'CROSS_MODULE_RISK',
      'customer',
      sr.customer,
      sr.customer,
      'Executive',
      case
        when sr.alert_level = 'CRITICAL'
          then 'CRITICAL'::executive_action_priority
        when sr.alert_level = 'WARNING'
          then 'HIGH'::executive_action_priority
        else 'MEDIUM'::executive_action_priority
      end,
      'OPEN'::executive_action_status,
      case
        when sr.alert_level = 'CRITICAL'
          then 'Riesgo transversal crÃ­tico: ' || sr.customer
        when sr.alert_level = 'WARNING'
          then 'Riesgo transversal elevado: ' || sr.customer
        else 'Riesgo transversal detectado: ' || sr.customer
      end,
      sr.executive_summary,
      sr.recommended_action,
      sr.metadata,
      now(),
      now()
    from source_rows sr
    where not exists (
      select 1
      from executive_actions ea
      where ea.action_key = sr.action_key
    )
    returning id
  )
  select count(*) into v_created_count
  from inserted;

  /*
    2. Reabrir acciones cerradas si el riesgo vuelve a aparecer
  */
  with source_rows as (
    select
      'cross_module_risk:' || customer as action_key,
      customer,
      alert_level,
      executive_summary,
      recommended_action,
      jsonb_build_object(
        'cross_module_risk_score', cross_module_risk_score,
        'cross_module_risk_level', cross_module_risk_level,
        'primary_driver', primary_driver,
        'alert_level', alert_level,
        'alert_type', alert_type,
        'alert_reason', alert_reason,
        'health_signal', health_signal,
        'volume_signal', volume_signal,
        'qty_growth_pct', qty_growth_pct,
        'sell_growth_pct', sell_growth_pct,
        'contribution_pct', contribution_pct,
        'production_late_rate_pct', production_late_rate_pct,
        'avg_delay_production_days', avg_delay_production_days,
        'negotiation_profile', negotiation_profile
      ) as metadata
    from vw_exec_cross_module_risk_v1
    where alert_level in ('CRITICAL', 'WARNING')
      and customer is not null
  ),
  reopened as (
    update executive_actions ea
    set
      status = 'OPEN',
      priority = case
        when sr.alert_level = 'CRITICAL'
          then 'CRITICAL'::executive_action_priority
        when sr.alert_level = 'WARNING'
          then 'HIGH'::executive_action_priority
        else ea.priority
      end,
      title = case
        when sr.alert_level = 'CRITICAL'
          then 'Riesgo transversal crÃ­tico: ' || sr.customer
        when sr.alert_level = 'WARNING'
          then 'Riesgo transversal elevado: ' || sr.customer
        else ea.title
      end,
      description = sr.executive_summary,
      recommended_action = sr.recommended_action,
      metadata = ea.metadata || sr.metadata || jsonb_build_object(
        'reopened_at', now(),
        'previous_resolved_at', ea.resolved_at
      ),
      last_seen_at = now(),
      resolved_at = null,
      resolution_note = null,
      updated_at = now()
    from source_rows sr
    where ea.action_key = sr.action_key
      and ea.status in ('RESOLVED', 'DISMISSED')
    returning ea.id
  )
  select count(*) into v_reopened_count
  from reopened;

  /*
    3. Actualizar acciones abiertas sin borrar owner, notas ni decisiones
  */
  with source_rows as (
    select
      'cross_module_risk:' || customer as action_key,
      customer,
      alert_level,
      executive_summary,
      recommended_action,
      jsonb_build_object(
        'cross_module_risk_score', cross_module_risk_score,
        'cross_module_risk_level', cross_module_risk_level,
        'primary_driver', primary_driver,
        'alert_level', alert_level,
        'alert_type', alert_type,
        'alert_reason', alert_reason,
        'commercial_risk_points', commercial_risk_points,
        'production_risk_points', production_risk_points,
        'margin_risk_points', margin_risk_points,
        'development_risk_points', development_risk_points,
        'concentration_risk_points', concentration_risk_points,
        'contextual_business_profile', contextual_business_profile,
        'contextual_business_score', contextual_business_score,
        'customer_friction_score', customer_friction_score,
        'health_signal', health_signal,
        'volume_signal', volume_signal,
        'qty_growth_pct', qty_growth_pct,
        'sell_growth_pct', sell_growth_pct,
        'score_model', score_model,
        'po_count', po_count,
        'line_count', line_count,
        'factory_count', factory_count,
        'model_count', model_count,
        'qty_total', qty_total,
        'sell_amount_total', sell_amount_total,
        'contribution_total', contribution_total,
        'contribution_pct', contribution_pct,
        'production_late_rate_pct', production_late_rate_pct,
        'avg_delay_production_days', avg_delay_production_days,
        'max_delay_production_days', max_delay_production_days,
        'executive_tier', executive_tier,
        'negotiation_score', negotiation_score,
        'negotiation_profile', negotiation_profile,
        'avg_revisions', avg_revisions,
        'avg_days_to_order', avg_days_to_order
      ) as metadata
    from vw_exec_cross_module_risk_v1
    where alert_level in ('CRITICAL', 'WARNING')
      and customer is not null
  ),
  updated as (
    update executive_actions ea
    set
      priority = case
        when sr.alert_level = 'CRITICAL'
          then 'CRITICAL'::executive_action_priority
        when sr.alert_level = 'WARNING'
          then 'HIGH'::executive_action_priority
        else ea.priority
      end,
      title = case
        when sr.alert_level = 'CRITICAL'
          then 'Riesgo transversal crÃ­tico: ' || sr.customer
        when sr.alert_level = 'WARNING'
          then 'Riesgo transversal elevado: ' || sr.customer
        else ea.title
      end,
      description = sr.executive_summary,
      recommended_action = sr.recommended_action,
      metadata = sr.metadata,
      last_seen_at = now(),
      updated_at = now()
    from source_rows sr
    where ea.action_key = sr.action_key
      and ea.status not in ('RESOLVED', 'DISMISSED')
    returning ea.id
  )
  select count(*) into v_updated_count
  from updated;

  /*
    4. Contar escalados actuales: HIGH que ahora pasan a CRITICAL
  */
  with source_rows as (
    select
      'cross_module_risk:' || customer as action_key
    from vw_exec_cross_module_risk_v1
    where alert_level = 'CRITICAL'
      and customer is not null
  )
  select count(*) into v_escalated_count
  from executive_actions ea
  join source_rows sr
    on sr.action_key = ea.action_key
  where ea.priority = 'CRITICAL'
    and ea.updated_at >= now() - interval '1 minute';

  created_count := v_created_count;
  updated_count := v_updated_count;
  reopened_count := v_reopened_count;
  escalated_count := v_escalated_count;

  return next;
end;
$$;


ALTER FUNCTION "public"."sync_exec_actions_from_risk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_executive_action_from_signal"("p_action_key" "text", "p_source_view" "text", "p_source_type" "text", "p_source_entity_type" "text", "p_source_entity_id" "text", "p_customer" "text", "p_factory" "text", "p_season" "text", "p_module" "text", "p_priority" "public"."executive_action_priority", "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id uuid;
begin
  insert into executive_actions (
    action_key,
    source_view,
    source_type,
    source_entity_type,
    source_entity_id,
    customer,
    factory,
    season,
    module,
    priority,
    title,
    description,
    recommended_action,
    metadata,
    first_detected_at,
    last_seen_at
  )
  values (
    p_action_key,
    p_source_view,
    p_source_type,
    p_source_entity_type,
    p_source_entity_id,
    p_customer,
    p_factory,
    p_season,
    p_module,
    p_priority,
    p_title,
    p_description,
    p_recommended_action,
    coalesce(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (action_key)
  do update set
    last_seen_at = now(),
    priority = excluded.priority,
    title = excluded.title,
    description = excluded.description,
    recommended_action = excluded.recommended_action,
    metadata = excluded.metadata,
    updated_at = now()
  where executive_actions.status not in ('RESOLVED', 'DISMISSED')
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."sync_executive_action_from_signal"("p_action_key" "text", "p_source_view" "text", "p_source_type" "text", "p_source_entity_type" "text", "p_source_entity_id" "text", "p_customer" "text", "p_factory" "text", "p_season" "text", "p_module" "text", "p_priority" "public"."executive_action_priority", "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."truncate_alertas"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  truncate table alertas restart identity;
end;
$$;


ALTER FUNCTION "public"."truncate_alertas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_alertas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_alertas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alertas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "text" NOT NULL,
    "subtipo" "text",
    "fecha" "date" NOT NULL,
    "severidad" "text" DEFAULT 'media'::"text",
    "mensaje" "text",
    "es_estimada" boolean DEFAULT false,
    "leida" boolean DEFAULT false,
    "po_id" "uuid",
    "linea_pedido_id" "uuid",
    "muestra_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."alertas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_saved_analyses" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "area" "text" NOT NULL,
    "concept" "text" NOT NULL,
    "perspective" "text" NOT NULL,
    "context" "text" NOT NULL,
    "season" "text",
    "customer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "representation" "text" DEFAULT 'automatic'::"text" NOT NULL,
    CONSTRAINT "analytics_saved_analyses_area_not_blank" CHECK (("btrim"("area") <> ''::"text")),
    CONSTRAINT "analytics_saved_analyses_concept_not_blank" CHECK (("btrim"("concept") <> ''::"text")),
    CONSTRAINT "analytics_saved_analyses_context_not_blank" CHECK (("btrim"("context") <> ''::"text")),
    CONSTRAINT "analytics_saved_analyses_name_not_blank" CHECK (("btrim"("name") <> ''::"text")),
    CONSTRAINT "analytics_saved_analyses_perspective_not_blank" CHECK (("btrim"("perspective") <> ''::"text")),
    CONSTRAINT "analytics_saved_analyses_representation_check" CHECK (("representation" = ANY (ARRAY['automatic'::"text", 'bar'::"text", 'line'::"text"])))
);


ALTER TABLE "public"."analytics_saved_analyses" OWNER TO "postgres";


ALTER TABLE "public"."analytics_saved_analyses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."analytics_saved_analyses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analytics_sync_status" (
    "sync_key" "text" NOT NULL,
    "status" "text" NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_failure_at" timestamp with time zone,
    "last_error" "text",
    "last_source" "text",
    "last_requested_by" "text",
    "last_duration_ms" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analytics_sync_status_singleton" CHECK (("sync_key" = 'main'::"text")),
    CONSTRAINT "analytics_sync_status_status_check" CHECK (("status" = ANY (ARRAY['NEVER'::"text", 'RUNNING'::"text", 'SUCCESS'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."analytics_sync_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."aprobaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "muestra_id" "uuid",
    "tipo_aprobacion" "text" NOT NULL,
    "estado" "text" NOT NULL,
    "fecha_aprobacion" "date",
    "round" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "etapa" "text"
);


ALTER TABLE "public"."aprobaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "extra" "jsonb",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."catalogos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cotizaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid",
    "variante_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "buy_price" numeric NOT NULL,
    "sell_price" numeric NOT NULL,
    "margin_pct" numeric,
    "commission_enabled" boolean DEFAULT false NOT NULL,
    "commission_rate" numeric,
    "rounding_step" numeric,
    "status" "text" DEFAULT 'enviada'::"text" NOT NULL,
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cotizaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dim_fecha" (
    "date_key" integer NOT NULL,
    "fecha" "date" NOT NULL,
    "anio" integer NOT NULL,
    "trimestre" integer NOT NULL,
    "mes" integer NOT NULL,
    "semana" integer NOT NULL,
    "dia" integer NOT NULL,
    "nombre_mes" "text" NOT NULL,
    "nombre_dia" "text" NOT NULL,
    "year_month" "text" NOT NULL,
    "es_fin_semana" boolean NOT NULL,
    "es_fin_mes" boolean NOT NULL
);


ALTER TABLE "public"."dim_fecha" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dim_operativa" (
    "operativa_key" smallint NOT NULL,
    "operativa_code" "text" NOT NULL,
    "operativa_family" "text" NOT NULL,
    "descripcion" "text",
    "has_real_cost" boolean NOT NULL,
    "default_commission_pct" numeric(7,4) DEFAULT 0 NOT NULL,
    "is_buy_sell" boolean NOT NULL
);


ALTER TABLE "public"."dim_operativa" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dim_operativa_operativa_key_seq"
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dim_operativa_operativa_key_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dim_operativa_operativa_key_seq" OWNED BY "public"."dim_operativa"."operativa_key";



CREATE TABLE IF NOT EXISTS "public"."executive_action_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_id" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "decision_reason" "text",
    "decision_by" "uuid",
    "decision_by_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."executive_action_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."executive_action_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_by_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."executive_action_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."executive_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_key" "text" NOT NULL,
    "source_view" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_entity_type" "text" DEFAULT 'customer'::"text" NOT NULL,
    "source_entity_id" "text" NOT NULL,
    "customer" "text",
    "factory" "text",
    "season" "text",
    "module" "text",
    "priority" "public"."executive_action_priority" DEFAULT 'MEDIUM'::"public"."executive_action_priority" NOT NULL,
    "status" "public"."executive_action_status" DEFAULT 'OPEN'::"public"."executive_action_status" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "recommended_action" "text",
    "owner_user_id" "uuid",
    "owner_label" "text",
    "first_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" "date",
    "resolved_at" timestamp with time zone,
    "resolution_note" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."executive_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."importacion_entidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "importacion_id" "uuid" NOT NULL,
    "tabla" "text" NOT NULL,
    "entidad_id" "uuid" NOT NULL,
    "accion" "text" DEFAULT 'created'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."importacion_entidades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."importaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre_archivo" "text" NOT NULL,
    "fecha_importacion" timestamp with time zone DEFAULT "now"(),
    "cantidad_registros" integer NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "datos" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'espana'::"text",
    "origen" "text" DEFAULT 'manual'::"text",
    "puede_revertirse" boolean DEFAULT true,
    "revertida_at" timestamp with time zone,
    "revertida_por" "uuid",
    "resumen" "jsonb",
    "error" "text"
);


ALTER TABLE "public"."importaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lineas_pedido" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_id" "uuid",
    "reference" "text",
    "style" "text" NOT NULL,
    "color" "text" NOT NULL,
    "size_run" "text",
    "qty" integer NOT NULL,
    "category" "text",
    "price" numeric(10,2),
    "amount" numeric(10,2),
    "pi_bsg" "text",
    "price_selling" numeric(10,2),
    "amount_selling" numeric(10,2),
    "trial_upper" "text",
    "trial_lasting" "text",
    "lasting" "text",
    "finish_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "etd" "date",
    "inspection" "date",
    "estado_inspeccion" "text",
    "channel" "text",
    "modelo_id" "uuid",
    "variante_id" "uuid",
    "master_buy_price_used" numeric,
    "master_sell_price_used" numeric,
    "master_currency_used" "text",
    "master_valid_from_used" "date",
    "master_price_id_used" "uuid",
    "master_price_source" "text",
    "importacion_id" "uuid",
    "pi_number" "text",
    "estado" "text" DEFAULT 'ACTIVA'::"text" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_reason" "text",
    "factory" "text",
    "booking" "date",
    "closing" "date",
    "shipping_date" "date"
);


ALTER TABLE "public"."lineas_pedido" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lineas_pedido"."pi_bsg" IS 'PI interna BSG especÃ­fica de la operativa BSG. No usar como PI normal de cliente.';



COMMENT ON COLUMN "public"."lineas_pedido"."pi_number" IS 'PI normal especÃ­fica de la lÃ­nea/modelo. Si es null, se usa pos.pi como PI general del PO. No sustituye pi_bsg.';



CREATE TABLE IF NOT EXISTS "public"."modelo_componentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "slot" integer DEFAULT 1 NOT NULL,
    "catalogo_id" "uuid",
    "percentage" numeric,
    "quality" "text",
    "material_text" "text",
    "extra" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variante_id" "uuid",
    CONSTRAINT "modelo_componentes_kind_check" CHECK (("kind" = ANY (ARRAY['upper'::"text", 'lining'::"text", 'insole'::"text", 'shoelace'::"text", 'outsole'::"text", 'packaging'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."modelo_componentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modelo_eventos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid" NOT NULL,
    "variante_id" "uuid",
    "entity_type" "text" DEFAULT 'modelo'::"text" NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "source" "text" DEFAULT 'system'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "season" "text",
    CONSTRAINT "modelo_eventos_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['modelo'::"text", 'variante'::"text", 'precio'::"text", 'componente'::"text", 'imagen'::"text"]))),
    CONSTRAINT "modelo_eventos_event_type_check" CHECK (("event_type" = ANY (ARRAY['SEASON_ACTIVATED'::"text", 'VARIANT_CREATED'::"text", 'VARIANT_UPDATED'::"text", 'PRICE_CREATED'::"text", 'PRICE_UPDATED'::"text", 'COMPONENT_UPDATED'::"text", 'IMAGE_UPLOADED'::"text"])))
);


ALTER TABLE "public"."modelo_eventos" OWNER TO "postgres";


COMMENT ON TABLE "public"."modelo_eventos" IS 'AuditorÃ­a de acciones realizadas sobre el catÃ¡logo operativo de modelos.';



COMMENT ON COLUMN "public"."modelo_eventos"."entity_type" IS 'Tipo de entidad afectada por el evento: modelo, variante, precio, componente o imagen.';



COMMENT ON COLUMN "public"."modelo_eventos"."payload" IS 'InformaciÃ³n especÃ­fica del evento en formato JSON.';



COMMENT ON COLUMN "public"."modelo_eventos"."season" IS 'Temporada relacionada con el evento, para facilitar consultas del timeline sin depender sÃ³lo del payload JSON.';



CREATE TABLE IF NOT EXISTS "public"."modelo_imagenes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid" NOT NULL,
    "file_key" "text" NOT NULL,
    "public_url" "text",
    "kind" "text" DEFAULT 'gallery'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "width" integer,
    "height" integer,
    "mime_type" "text",
    "size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variante_id" "uuid",
    CONSTRAINT "modelo_imagenes_kind_check" CHECK (("kind" = ANY (ARRAY['main'::"text", 'gallery'::"text", 'tech'::"text", 'other'::"text"]))),
    CONSTRAINT "modelo_imagenes_kind_variante_check" CHECK (((("kind" = 'main'::"text") AND ("variante_id" IS NULL)) OR (("kind" <> 'main'::"text") AND (("variante_id" IS NOT NULL) OR ("kind" = 'gallery'::"text")))))
);


ALTER TABLE "public"."modelo_imagenes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modelo_precios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid" NOT NULL,
    "season" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "buy_price" numeric,
    "sell_price" numeric,
    "valid_from" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variante_id" "uuid",
    "category" "text",
    "size_run" "text",
    "channel" "text"
);


ALTER TABLE "public"."modelo_precios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modelo_variantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "modelo_id" "uuid" NOT NULL,
    "season" "text" NOT NULL,
    "color" "text" DEFAULT ''::"text" NOT NULL,
    "factory" "text",
    "reference" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'activo'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_key" "text" GENERATED ALWAYS AS (COALESCE("reference", ''::"text")) STORED
);


ALTER TABLE "public"."modelo_variantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modelos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "style" "text" NOT NULL,
    "description" "text",
    "supplier" "text",
    "customer" "text",
    "factory" "text",
    "merchandiser_factory" "text",
    "construction" "text",
    "reference" "text",
    "size_range" "text",
    "last_no" "text",
    "last_name" "text",
    "picture_url" "text",
    "packaging_price" numeric,
    "status" "public"."modelo_status" DEFAULT 'desarrollo'::"public"."modelo_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."modelos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muestras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "linea_pedido_id" "uuid",
    "tipo_muestra" "text" NOT NULL,
    "round" "text" NOT NULL,
    "fecha_muestra" "date",
    "estado_muestra" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "fecha_teorica" "date"
);


ALTER TABLE "public"."muestras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po" "text" NOT NULL,
    "supplier" "text" NOT NULL,
    "season" "text" NOT NULL,
    "customer" "text" NOT NULL,
    "factory" "text",
    "po_date" "date",
    "etd_pi" "date",
    "pi" "text",
    "channel" "text",
    "booking" "text",
    "closing" "text",
    "shipping_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text" DEFAULT 'USD'::"text",
    "estado_inspeccion" "text",
    "inspection" "text",
    "importacion_id" "uuid",
    "estado" "text" DEFAULT 'ACTIVO'::"text" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_reason" "text"
);


ALTER TABLE "public"."pos" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_fact_operacion_linea" AS
 WITH "base" AS (
         SELECT "lp"."id" AS "linea_pedido_id",
            "lp"."po_id",
            "p"."po" AS "po_number",
            "p"."supplier",
            "p"."customer",
            "p"."factory",
            "p"."season",
            COALESCE("lp"."channel", "p"."channel") AS "channel",
            "lp"."modelo_id",
            "lp"."variante_id",
            "lp"."reference",
            "lp"."style",
            "lp"."color",
            "lp"."size_run",
            "lp"."category",
            "p"."po_date",
            "p"."etd_pi",
            "p"."shipping_date",
            "lp"."finish_date",
            "lp"."etd",
            "lp"."inspection" AS "inspection_date",
                CASE
                    WHEN (("lp"."pi_bsg" IS NOT NULL) AND ("btrim"("lp"."pi_bsg") <> ''::"text")) THEN 'BSG'::"text"
                    ELSE 'XIAMEN_DIC'::"text"
                END AS "operativa_code",
                CASE
                    WHEN (("lp"."pi_bsg" IS NOT NULL) AND ("btrim"("lp"."pi_bsg") <> ''::"text")) THEN 'BUY_SELL'::"text"
                    ELSE 'COMMISSION'::"text"
                END AS "operativa_family",
            "lp"."pi_bsg",
            "lp"."qty",
            "lp"."price",
            "lp"."amount",
            "lp"."price_selling",
            "lp"."amount_selling",
            "lp"."master_buy_price_used",
            "lp"."master_sell_price_used",
            "lp"."master_currency_used",
            "lp"."master_valid_from_used",
            "lp"."master_price_id_used",
            "lp"."master_price_source",
            "lp"."created_at",
            "lp"."updated_at",
            "p"."created_at" AS "po_created_at",
            "p"."updated_at" AS "po_updated_at"
           FROM ("public"."lineas_pedido" "lp"
             JOIN "public"."pos" "p" ON (("p"."id" = "lp"."po_id")))
        )
 SELECT "linea_pedido_id",
    "po_id",
    "po_number",
    "supplier",
    "customer",
    "factory",
    "season",
    "channel",
    "modelo_id",
    "variante_id",
    "reference",
    "style",
    "color",
    "size_run",
    "category",
    "po_date",
    "etd_pi",
    "shipping_date",
    "finish_date",
    "etd",
    "inspection_date",
        CASE
            WHEN ("po_date" IS NOT NULL) THEN ("to_char"(("po_date")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "po_date_key",
        CASE
            WHEN ("etd_pi" IS NOT NULL) THEN ("to_char"(("etd_pi")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "etd_pi_date_key",
        CASE
            WHEN ("shipping_date" IS NOT NULL) THEN ("to_char"(("shipping_date")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "shipping_date_key",
        CASE
            WHEN ("finish_date" IS NOT NULL) THEN ("to_char"(("finish_date")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "finish_date_key",
        CASE
            WHEN ("etd" IS NOT NULL) THEN ("to_char"(("etd")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "etd_date_key",
        CASE
            WHEN ("inspection_date" IS NOT NULL) THEN ("to_char"(("inspection_date")::timestamp with time zone, 'YYYYMMDD'::"text"))::integer
            ELSE NULL::integer
        END AS "inspection_date_key",
    "operativa_code",
    "operativa_family",
    "pi_bsg",
    "qty" AS "qty_total",
    "price" AS "price_raw",
    "price_selling" AS "price_selling_raw",
    "amount" AS "amount_raw",
    "amount_selling" AS "amount_selling_raw",
    "master_buy_price_used",
    "master_sell_price_used",
    "master_currency_used",
    "master_valid_from_used",
    "master_price_id_used",
    "master_price_source",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
            ELSE COALESCE("amount", (0)::numeric)
        END AS "sell_amount_real",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount", (0)::numeric)
            ELSE NULL::numeric
        END AS "buy_amount_real",
        CASE
            WHEN (("qty" > 0) AND ("operativa_code" = 'BSG'::"text")) THEN (COALESCE("amount_selling", (0)::numeric) / ("qty")::numeric)
            WHEN (("qty" > 0) AND ("operativa_code" = 'XIAMEN_DIC'::"text")) THEN (COALESCE("amount", (0)::numeric) / ("qty")::numeric)
            ELSE NULL::numeric
        END AS "sell_price_avg_real",
        CASE
            WHEN (("qty" > 0) AND ("operativa_code" = 'BSG'::"text")) THEN (COALESCE("amount", (0)::numeric) / ("qty")::numeric)
            ELSE NULL::numeric
        END AS "buy_price_avg_real",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN (COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric))
            ELSE (0)::numeric
        END AS "margin_base_amount",
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "round"((COALESCE("amount", (0)::numeric) * 0.10), 2)
            ELSE (0)::numeric
        END AS "commission_amount",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN (COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric))
            ELSE (0)::numeric
        END AS "margin_total_amount",
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "round"((COALESCE("amount", (0)::numeric) * 0.10), 2)
            WHEN ("operativa_code" = 'BSG'::"text") THEN (COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric))
            ELSE (0)::numeric
        END AS "contribution_amount",
        CASE
            WHEN (
            CASE
                WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
                ELSE COALESCE("amount", (0)::numeric)
            END > (0)::numeric) THEN "round"(((
            CASE
                WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "round"((COALESCE("amount", (0)::numeric) * 0.10), 2)
                WHEN ("operativa_code" = 'BSG'::"text") THEN (COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric))
                ELSE (0)::numeric
            END /
            CASE
                WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
                ELSE COALESCE("amount", (0)::numeric)
            END) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "contribution_pct",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL)) THEN GREATEST(("finish_date" - "etd_pi"), 0)
            ELSE NULL::integer
        END AS "delay_production_days",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL) AND ("finish_date" <= "etd_pi")) THEN true
            WHEN (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL) AND ("finish_date" > "etd_pi")) THEN false
            ELSE NULL::boolean
        END AS "production_on_time_flag",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL) AND ("finish_date" > "etd_pi")) THEN true
            WHEN (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL)) THEN false
            ELSE NULL::boolean
        END AS "production_late_flag",
        CASE
            WHEN (("po_date" IS NOT NULL) AND ("finish_date" IS NOT NULL)) THEN ("finish_date" - "po_date")
            ELSE NULL::integer
        END AS "lead_time_order_to_finish_days",
        CASE
            WHEN (("po_date" IS NOT NULL) AND ("etd" IS NOT NULL)) THEN ("etd" - "po_date")
            ELSE NULL::integer
        END AS "lead_time_order_to_etd_days",
    ("modelo_id" IS NOT NULL) AS "has_modelo_link",
    ("variante_id" IS NOT NULL) AS "has_variante_link",
    ("master_price_id_used" IS NOT NULL) AS "has_master_price_snapshot",
    (("finish_date" IS NOT NULL) AND ("etd_pi" IS NOT NULL)) AS "has_production_delay_basis",
    "created_at",
    "updated_at",
    "po_created_at",
    "po_updated_at"
   FROM "base" "b"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_fact_operacion_linea" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_defects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inspection_id" "uuid",
    "defect_id" "text",
    "defect_type" "text",
    "defect_category" "text",
    "defect_description" "text",
    "defect_quantity" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "action_plan" "text",
    "action_owner" "text",
    "action_due_date" "date",
    "action_status" "text" DEFAULT 'open'::"text",
    "action_closed_at" "date"
);


ALTER TABLE "public"."qc_defects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_inspections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_id" "uuid",
    "po_number" "text",
    "reference" "text",
    "style" "text",
    "color" "text",
    "inspector" "text",
    "qty_po" integer,
    "qty_inspected" integer,
    "aql_level" "text",
    "aql_result" "text",
    "critical_allowed" integer,
    "major_allowed" integer,
    "minor_allowed" integer,
    "critical_found" integer,
    "major_found" integer,
    "minor_found" integer,
    "inspection_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "report_number" "text" NOT NULL,
    "inspection_type" "text",
    "factory" "text",
    "customer" "text",
    "season" "text"
);


ALTER TABLE "public"."qc_inspections" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_profitability_profile" AS
 SELECT "customer",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
        CASE
            WHEN (("sum"("sell_amount_real") >= (1500000)::numeric) AND ("sum"("contribution_amount") >= (150000)::numeric)) THEN 'KEY_ACCOUNT'::"text"
            WHEN (("sum"("sell_amount_real") >= (750000)::numeric) AND ("sum"("contribution_amount") >= (75000)::numeric)) THEN 'CORE_ACCOUNT'::"text"
            WHEN ("sum"("sell_amount_real") >= (250000)::numeric) THEN 'GROWTH_ACCOUNT'::"text"
            ELSE 'SMALL_ACCOUNT'::"text"
        END AS "customer_size_band",
        CASE
            WHEN ("round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) >= (15)::numeric) THEN 'HIGH_MARGIN'::"text"
            WHEN ("round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) >= (10)::numeric) THEN 'MEDIUM_MARGIN'::"text"
            ELSE 'LOW_MARGIN'::"text"
        END AS "profitability_band"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "customer";


ALTER VIEW "public"."vw_customer_profitability_profile" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_quote_fact" AS
 WITH "master_match" AS (
         SELECT "c_1"."id" AS "cotizacion_id",
            "mp"."id" AS "master_price_id",
            "mp"."valid_from",
            "mp"."buy_price" AS "master_buy_price",
            "mp"."sell_price" AS "master_sell_price",
            "mp"."currency" AS "master_currency",
            "row_number"() OVER (PARTITION BY "c_1"."id" ORDER BY "mp"."valid_from" DESC, "mp"."created_at" DESC) AS "rn"
           FROM ("public"."cotizaciones" "c_1"
             LEFT JOIN "public"."modelo_precios" "mp" ON (((("mp"."variante_id" = "c_1"."variante_id") OR (("mp"."variante_id" IS NULL) AND ("mp"."modelo_id" = "c_1"."modelo_id"))) AND ("mp"."valid_from" <= ("c_1"."created_at")::"date"))))
        )
 SELECT "c"."id" AS "cotizacion_id",
    "c"."created_at" AS "quote_created_at",
    ("c"."created_at")::"date" AS "quote_date",
    ("to_char"("c"."created_at", 'YYYYMMDD'::"text"))::integer AS "quote_date_key",
    "to_char"("date_trunc"('month'::"text", "c"."created_at"), 'YYYY-MM'::"text") AS "quote_year_month",
    "c"."modelo_id",
    "c"."variante_id",
    "m"."customer",
    "mv"."season",
    "m"."style",
    COALESCE("mv"."reference", "m"."reference") AS "reference",
    "mv"."color",
    COALESCE("mv"."factory", "m"."factory") AS "factory",
    "c"."currency",
    "c"."buy_price" AS "quote_buy_price",
    "c"."sell_price" AS "quote_sell_price",
    "c"."margin_pct" AS "quote_margin_pct",
    "c"."commission_enabled",
    "c"."commission_rate",
    "c"."rounding_step",
    "c"."status" AS "quote_status",
    "c"."notes",
    "c"."created_by",
    "mm"."master_price_id",
    "mm"."valid_from" AS "master_valid_from",
    "mm"."master_buy_price",
    "mm"."master_sell_price",
    "mm"."master_currency",
    "round"(("c"."buy_price" - COALESCE("mm"."master_buy_price", (0)::numeric)), 4) AS "gap_vs_master_buy",
    "round"(("c"."sell_price" - COALESCE("mm"."master_sell_price", (0)::numeric)), 4) AS "gap_vs_master_sell",
        CASE
            WHEN (("mm"."master_sell_price" IS NOT NULL) AND ("mm"."master_sell_price" <> (0)::numeric)) THEN "round"(((("c"."sell_price" - "mm"."master_sell_price") / "mm"."master_sell_price") * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "gap_vs_master_sell_pct",
        CASE
            WHEN (("c"."sell_price" IS NOT NULL) AND ("c"."buy_price" IS NOT NULL)) THEN "round"(("c"."sell_price" - "c"."buy_price"), 4)
            ELSE NULL::numeric
        END AS "quote_margin_amount",
    "row_number"() OVER (PARTITION BY "m"."customer", "c"."modelo_id", "c"."variante_id" ORDER BY "c"."created_at", "c"."id") AS "revision_no_inferred",
    "count"(*) OVER (PARTITION BY "m"."customer", "c"."modelo_id", "c"."variante_id") AS "revision_count_inferred"
   FROM ((("public"."cotizaciones" "c"
     LEFT JOIN "public"."modelos" "m" ON (("m"."id" = "c"."modelo_id")))
     LEFT JOIN "public"."modelo_variantes" "mv" ON (("mv"."id" = "c"."variante_id")))
     LEFT JOIN "master_match" "mm" ON ((("mm"."cotizacion_id" = "c"."id") AND ("mm"."rn" = 1))));


ALTER VIEW "public"."vw_dev_quote_fact" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_quote_vs_order" AS
 WITH "order_match" AS (
         SELECT "q_1"."cotizacion_id",
            "f"."linea_pedido_id",
            "f"."po_id",
            "f"."po_number",
            "f"."customer",
            "f"."factory",
            "f"."season" AS "order_season",
            "f"."po_date",
            "f"."operativa_code",
            "f"."sell_price_avg_real",
            "f"."buy_price_avg_real",
            "row_number"() OVER (PARTITION BY "q_1"."cotizacion_id" ORDER BY "f"."po_date", "f"."created_at") AS "rn"
           FROM ("public"."vw_dev_quote_fact" "q_1"
             JOIN "public"."mv_fact_operacion_linea" "f" ON ((("f"."customer" = "q_1"."customer") AND (("f"."variante_id" = "q_1"."variante_id") OR ("f"."modelo_id" = "q_1"."modelo_id")) AND (("f"."po_date" IS NULL) OR ("f"."po_date" >= "q_1"."quote_date")))))
        )
 SELECT "q"."cotizacion_id",
    "q"."quote_created_at",
    "q"."quote_date",
    "q"."customer",
    "q"."season",
    "q"."style",
    "q"."reference",
    "q"."color",
    "q"."factory" AS "quote_factory",
    "q"."quote_status",
    "q"."revision_no_inferred",
    "q"."revision_count_inferred",
    "q"."quote_buy_price",
    "q"."quote_sell_price",
    "q"."quote_margin_pct",
    "q"."quote_margin_amount",
    "om"."linea_pedido_id",
    "om"."po_id",
    "om"."po_number",
    "om"."factory" AS "order_factory",
    "om"."order_season",
    "om"."po_date",
    "om"."operativa_code",
    "om"."buy_price_avg_real" AS "order_buy_price",
    "om"."sell_price_avg_real" AS "order_sell_price",
    "round"(("om"."buy_price_avg_real" - "q"."quote_buy_price"), 4) AS "gap_order_vs_quote_buy",
    "round"(("om"."sell_price_avg_real" - "q"."quote_sell_price"), 4) AS "gap_order_vs_quote_sell",
        CASE
            WHEN (("q"."quote_sell_price" IS NOT NULL) AND ("q"."quote_sell_price" <> (0)::numeric) AND ("om"."sell_price_avg_real" IS NOT NULL)) THEN "round"(((("om"."sell_price_avg_real" - "q"."quote_sell_price") / "q"."quote_sell_price") * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "gap_order_vs_quote_sell_pct",
        CASE
            WHEN ("om"."po_date" IS NOT NULL) THEN ("om"."po_date" - "q"."quote_date")
            ELSE NULL::integer
        END AS "days_quote_to_order"
   FROM ("public"."vw_dev_quote_fact" "q"
     LEFT JOIN "order_match" "om" ON ((("om"."cotizacion_id" = "q"."cotizacion_id") AND ("om"."rn" = 1))));


ALTER VIEW "public"."vw_dev_quote_vs_order" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_conversion_by_customer" AS
 SELECT "customer",
    "season",
    "count"(*) AS "quote_count",
    "count"(*) FILTER (WHERE ("po_id" IS NOT NULL)) AS "matched_order_count",
    "round"(((("count"(*) FILTER (WHERE ("po_id" IS NOT NULL)))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "approx_conversion_rate_pct",
    "round"("avg"("days_quote_to_order"), 2) AS "avg_days_quote_to_order",
    "round"("avg"("gap_order_vs_quote_sell_pct"), 2) AS "avg_gap_order_vs_quote_sell_pct",
    "round"("avg"("revision_count_inferred"), 2) AS "avg_revision_count"
   FROM "public"."vw_dev_quote_vs_order"
  GROUP BY "customer", "season";


ALTER VIEW "public"."vw_dev_conversion_by_customer" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_customer_negotiation_score" AS
 WITH "base" AS (
         SELECT "o"."customer",
            "o"."season",
            "count"(*) AS "quote_count",
            "round"("avg"("q"."gap_vs_master_sell_pct"), 2) AS "avg_gap_vs_master",
            "round"("avg"("o"."gap_order_vs_quote_sell_pct"), 2) AS "avg_gap_quote_to_order",
            "round"("avg"("o"."revision_count_inferred"), 2) AS "avg_revisions",
            "round"("avg"("o"."days_quote_to_order"), 2) AS "avg_days_to_order"
           FROM ("public"."vw_dev_quote_vs_order" "o"
             JOIN "public"."vw_dev_quote_fact" "q" ON (("q"."cotizacion_id" = "o"."cotizacion_id")))
          GROUP BY "o"."customer", "o"."season"
        ), "score_calc" AS (
         SELECT "base"."customer",
            "base"."season",
            "base"."quote_count",
            "base"."avg_gap_vs_master",
            "base"."avg_gap_quote_to_order",
            "base"."avg_revisions",
            "base"."avg_days_to_order",
            (((("abs"(COALESCE("base"."avg_gap_vs_master", (0)::numeric)) * 0.40) + ("abs"(COALESCE("base"."avg_gap_quote_to_order", (0)::numeric)) * 0.30)) + (COALESCE("base"."avg_revisions", (0)::numeric) * 0.20)) + (
                CASE
                    WHEN ("base"."avg_days_to_order" IS NULL) THEN (0)::numeric
                    ELSE (10.0 / GREATEST("base"."avg_days_to_order", (1)::numeric))
                END * 0.10)) AS "negotiation_score"
           FROM "base"
        )
 SELECT "customer",
    "season",
    "quote_count",
    "avg_gap_vs_master",
    "avg_gap_quote_to_order",
    "avg_revisions",
    "avg_days_to_order",
    "round"("negotiation_score", 2) AS "negotiation_score",
        CASE
            WHEN ("negotiation_score" >= (6)::numeric) THEN 'AGGRESSIVE'::"text"
            WHEN ("negotiation_score" >= (3)::numeric) THEN 'NORMAL'::"text"
            ELSE 'EASY'::"text"
        END AS "negotiation_profile"
   FROM "score_calc";


ALTER VIEW "public"."vw_dev_customer_negotiation_score" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_customer_price_pressure" AS
 SELECT "o"."customer",
    "o"."season",
    "count"(*) AS "quote_count",
    "round"("avg"("q"."gap_vs_master_sell_pct"), 2) AS "avg_gap_vs_master_sell_pct",
    "round"("avg"("q"."quote_margin_pct"), 2) AS "avg_quote_margin_pct",
    "round"("avg"("o"."revision_count_inferred"), 2) AS "avg_revision_count",
    "round"("avg"("o"."gap_order_vs_quote_sell_pct"), 2) AS "avg_gap_order_vs_quote_sell_pct",
        CASE
            WHEN ("round"("avg"("q"."gap_vs_master_sell_pct"), 2) <= ('-5'::integer)::numeric) THEN 'HIGH_PRESSURE'::"text"
            WHEN ("round"("avg"("q"."gap_vs_master_sell_pct"), 2) <= ('-2'::integer)::numeric) THEN 'MEDIUM_PRESSURE'::"text"
            ELSE 'LOW_PRESSURE'::"text"
        END AS "pressure_level"
   FROM ("public"."vw_dev_quote_vs_order" "o"
     JOIN "public"."vw_dev_quote_fact" "q" ON (("q"."cotizacion_id" = "o"."cotizacion_id")))
  GROUP BY "o"."customer", "o"."season";


ALTER VIEW "public"."vw_dev_customer_price_pressure" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_fact_operacion_timeline" AS
 SELECT "linea_pedido_id",
    "po_id",
    "po_number",
    "supplier",
    "customer",
    "factory",
    "season",
    "channel",
    "modelo_id",
    "variante_id",
    "reference",
    "style",
    "color",
    "size_run",
    "category",
    "po_date",
    "etd_pi",
    "shipping_date",
    "finish_date",
    "etd",
    "inspection_date",
    "po_date_key",
    "etd_pi_date_key",
    "shipping_date_key",
    "finish_date_key",
    "etd_date_key",
    "inspection_date_key",
    "operativa_code",
    "operativa_family",
    "pi_bsg",
    "qty_total",
    "price_raw",
    "price_selling_raw",
    "amount_raw",
    "amount_selling_raw",
    "master_buy_price_used",
    "master_sell_price_used",
    "master_currency_used",
    "master_valid_from_used",
    "master_price_id_used",
    "master_price_source",
    "sell_amount_real",
    "buy_amount_real",
    "sell_price_avg_real",
    "buy_price_avg_real",
    "margin_base_amount",
    "commission_amount",
    "margin_total_amount",
    "contribution_amount",
    "contribution_pct",
    "delay_production_days",
    "production_on_time_flag",
    "production_late_flag",
    "lead_time_order_to_finish_days",
    "lead_time_order_to_etd_days",
    "has_modelo_link",
    "has_variante_link",
    "has_master_price_snapshot",
    "has_production_delay_basis",
    "created_at",
    "updated_at",
    "po_created_at",
    "po_updated_at",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL)) THEN ("shipping_date" - "finish_date")
            ELSE NULL::integer
        END AS "booking_delay_days",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL) AND ("shipping_date" > "finish_date")) THEN true
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL)) THEN false
            ELSE NULL::boolean
        END AS "booking_delay_flag",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL) AND ("shipping_date" <= "finish_date")) THEN true
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL)) THEN false
            ELSE NULL::boolean
        END AS "booking_on_time_flag",
        CASE
            WHEN (("finish_date" IS NOT NULL) AND ("shipping_date" IS NOT NULL)) THEN true
            ELSE false
        END AS "has_booking_delay_basis"
   FROM "public"."mv_fact_operacion_linea" "f";


ALTER VIEW "public"."vw_fact_operacion_timeline" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_customer_logistics_pressure_ranking" AS
 SELECT "customer",
    "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "production_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "production_late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_production_delay",
    "round"(((("sum"(
        CASE
            WHEN "production_late_flag" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
    "count"(*) FILTER (WHERE "has_booking_delay_basis") AS "booking_basis",
    "count"(*) FILTER (WHERE ("booking_delay_flag" = true)) AS "booking_late_lines",
    "round"("avg"("booking_delay_days"), 2) AS "avg_booking_delay",
    "max"("booking_delay_days") AS "max_booking_delay",
    "round"(((("sum"(
        CASE
            WHEN "booking_delay_flag" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct",
    "round"(((COALESCE("avg"("booking_delay_days"), (0)::numeric) * 0.6) + (COALESCE(((("sum"(
        CASE
            WHEN "booking_delay_flag" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), (0)::numeric) * 0.4)), 2) AS "logistics_pressure_score",
    "rank"() OVER (ORDER BY ((COALESCE("avg"("booking_delay_days"), (0)::numeric) * 0.6) + (COALESCE(((("sum"(
        CASE
            WHEN "booking_delay_flag" THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), (0)::numeric) * 0.4)) DESC) AS "logistics_pressure_rank"
   FROM "public"."vw_fact_operacion_timeline"
  GROUP BY "customer", "season";


ALTER VIEW "public"."vw_exec_customer_logistics_pressure_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_defect_summary" AS
 SELECT "inspection_id",
    "count"(*) AS "defect_line_count",
    "count"(DISTINCT "defect_id") AS "defect_code_count",
    "sum"(COALESCE("defect_quantity", 0)) AS "total_defect_qty",
    "sum"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'critical'::"text") THEN COALESCE("defect_quantity", 0)
            ELSE 0
        END) AS "critical_defect_qty",
    "sum"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'major'::"text") THEN COALESCE("defect_quantity", 0)
            ELSE 0
        END) AS "major_defect_qty",
    "sum"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'minor'::"text") THEN COALESCE("defect_quantity", 0)
            ELSE 0
        END) AS "minor_defect_qty",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("defect_category", ''::"text")) = 'critical'::"text")) AS "critical_defect_lines",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("defect_category", ''::"text")) = 'major'::"text")) AS "major_defect_lines",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("defect_category", ''::"text")) = 'minor'::"text")) AS "minor_defect_lines",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("action_status", 'open'::"text")) = ANY (ARRAY['open'::"text", 'pending'::"text", 'in_progress'::"text"]))) AS "open_action_lines",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("action_status", ''::"text")) = ANY (ARRAY['closed'::"text", 'done'::"text", 'resolved'::"text"]))) AS "closed_action_lines",
    ("max"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'critical'::"text") THEN 1
            ELSE 0
        END) = 1) AS "has_critical_defect",
    ("max"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'major'::"text") THEN 1
            ELSE 0
        END) = 1) AS "has_major_defect",
    ("max"(
        CASE
            WHEN ("lower"(COALESCE("defect_category", ''::"text")) = 'minor'::"text") THEN 1
            ELSE 0
        END) = 1) AS "has_minor_defect"
   FROM "public"."qc_defects" "qd"
  GROUP BY "inspection_id";


ALTER VIEW "public"."vw_qc_defect_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_inspection_summary" AS
 SELECT "id" AS "inspection_id",
    "po_id",
    "po_number",
    "reference",
    "style",
    "color",
    "inspector",
    "factory",
    "customer",
    "season",
    "inspection_date",
    "report_number",
    "inspection_type",
    "qty_po",
    "qty_inspected",
    "aql_level",
    "aql_result",
    "critical_allowed",
    "major_allowed",
    "minor_allowed",
    "critical_found",
    "major_found",
    "minor_found",
    ((COALESCE("critical_found", 0) + COALESCE("major_found", 0)) + COALESCE("minor_found", 0)) AS "total_defects_found",
        CASE
            WHEN (COALESCE("qty_inspected", 0) > 0) THEN "round"((((((COALESCE("critical_found", 0) + COALESCE("major_found", 0)) + COALESCE("minor_found", 0)))::numeric / ("qty_inspected")::numeric) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "defect_rate_pct",
        CASE
            WHEN ("upper"(COALESCE("aql_result", ''::"text")) = ANY (ARRAY['PASS'::"text", 'OK'::"text", 'APPROVED'::"text"])) THEN true
            WHEN ("upper"(COALESCE("aql_result", ''::"text")) = ANY (ARRAY['FAIL'::"text", 'REJECTED'::"text", 'NOT APPROVED'::"text"])) THEN false
            ELSE NULL::boolean
        END AS "qc_pass_flag",
        CASE
            WHEN (COALESCE("critical_found", 0) > 0) THEN true
            ELSE false
        END AS "has_critical_defect",
        CASE
            WHEN (COALESCE("major_found", 0) > 0) THEN true
            ELSE false
        END AS "has_major_defect",
        CASE
            WHEN (COALESCE("minor_found", 0) > 0) THEN true
            ELSE false
        END AS "has_minor_defect",
    "created_at"
   FROM "public"."qc_inspections" "qi";


ALTER VIEW "public"."vw_qc_inspection_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_operacion_bridge" AS
 WITH "op" AS (
         SELECT "vw_fact_operacion_timeline"."po_id",
            "vw_fact_operacion_timeline"."po_number",
            "vw_fact_operacion_timeline"."factory",
            "vw_fact_operacion_timeline"."customer",
            "vw_fact_operacion_timeline"."season",
            "count"(*) AS "line_count",
            "count"(DISTINCT "vw_fact_operacion_timeline"."modelo_id") AS "model_count",
            "count"(DISTINCT "vw_fact_operacion_timeline"."variante_id") AS "variante_count",
            "sum"("vw_fact_operacion_timeline"."qty_total") AS "qty_total",
            "round"("sum"("vw_fact_operacion_timeline"."sell_amount_real"), 2) AS "sell_amount_total",
            "round"("sum"("vw_fact_operacion_timeline"."contribution_amount"), 2) AS "contribution_total",
            "round"("avg"("vw_fact_operacion_timeline"."delay_production_days"), 2) AS "avg_delay_production_days",
            "max"("vw_fact_operacion_timeline"."delay_production_days") AS "max_delay_production_days",
            "round"(((("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" = true) THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
            ("max"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" = true) THEN 1
                    ELSE 0
                END) = 1) AS "has_any_production_delay"
           FROM "public"."vw_fact_operacion_timeline"
          GROUP BY "vw_fact_operacion_timeline"."po_id", "vw_fact_operacion_timeline"."po_number", "vw_fact_operacion_timeline"."factory", "vw_fact_operacion_timeline"."customer", "vw_fact_operacion_timeline"."season"
        ), "top_model" AS (
         SELECT DISTINCT ON ("vw_fact_operacion_timeline"."po_id") "vw_fact_operacion_timeline"."po_id",
            "vw_fact_operacion_timeline"."modelo_id",
            "vw_fact_operacion_timeline"."style",
            "vw_fact_operacion_timeline"."reference",
            "vw_fact_operacion_timeline"."category"
           FROM "public"."vw_fact_operacion_timeline"
          ORDER BY "vw_fact_operacion_timeline"."po_id", "vw_fact_operacion_timeline"."qty_total" DESC NULLS LAST, "vw_fact_operacion_timeline"."contribution_amount" DESC NULLS LAST
        )
 SELECT "qis"."inspection_id",
    "qis"."po_id",
    COALESCE("qis"."po_number", "op"."po_number") AS "po_number",
    COALESCE("qis"."factory", "op"."factory") AS "factory",
    COALESCE("qis"."customer", "op"."customer") AS "customer",
    COALESCE("qis"."season", "op"."season") AS "season",
    "tm"."modelo_id",
    "tm"."style",
    "tm"."reference",
    "tm"."category",
    "qis"."inspection_date",
    "qis"."report_number",
    "qis"."inspection_type",
    "qis"."inspector",
    "qis"."qty_po",
    "qis"."qty_inspected",
    "qis"."aql_level",
    "qis"."aql_result",
    "qis"."qc_pass_flag",
    "qis"."critical_found",
    "qis"."major_found",
    "qis"."minor_found",
    "qis"."total_defects_found",
    "qis"."defect_rate_pct",
    COALESCE("qds"."defect_line_count", (0)::bigint) AS "defect_line_count",
    COALESCE("qds"."defect_code_count", (0)::bigint) AS "defect_code_count",
    COALESCE("qds"."total_defect_qty", (0)::bigint) AS "total_defect_qty",
    COALESCE("qds"."critical_defect_qty", (0)::bigint) AS "critical_defect_qty",
    COALESCE("qds"."major_defect_qty", (0)::bigint) AS "major_defect_qty",
    COALESCE("qds"."minor_defect_qty", (0)::bigint) AS "minor_defect_qty",
    COALESCE("qds"."open_action_lines", (0)::bigint) AS "open_action_lines",
    COALESCE("qds"."closed_action_lines", (0)::bigint) AS "closed_action_lines",
    COALESCE("qds"."has_critical_defect", "qis"."has_critical_defect", false) AS "has_critical_defect",
    COALESCE("qds"."has_major_defect", "qis"."has_major_defect", false) AS "has_major_defect",
    COALESCE("qds"."has_minor_defect", "qis"."has_minor_defect", false) AS "has_minor_defect",
    "op"."line_count",
    "op"."model_count",
    "op"."variante_count",
    "op"."qty_total" AS "po_qty_total",
    "op"."sell_amount_total",
    "op"."contribution_total",
    "op"."avg_delay_production_days",
    "op"."max_delay_production_days",
    "op"."production_late_rate_pct",
    "op"."has_any_production_delay"
   FROM ((("public"."vw_qc_inspection_summary" "qis"
     LEFT JOIN "public"."vw_qc_defect_summary" "qds" ON (("qds"."inspection_id" = "qis"."inspection_id")))
     LEFT JOIN "op" ON (("op"."po_id" = "qis"."po_id")))
     LEFT JOIN "top_model" "tm" ON (("tm"."po_id" = "qis"."po_id")));


ALTER VIEW "public"."vw_qc_operacion_bridge" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_by_customer" AS
 SELECT "customer",
    "count"(*) AS "inspection_count",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"(COALESCE("qty_inspected", 0)) AS "qty_inspected_total",
    "round"("sum"(COALESCE("sell_amount_total", (0)::numeric)), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("contribution_total", (0)::numeric)), 2) AS "contribution_total",
    "sum"(COALESCE("total_defects_found", 0)) AS "total_defects_found",
    "sum"(COALESCE("critical_found", 0)) AS "critical_found",
    "sum"(COALESCE("major_found", 0)) AS "major_found",
    "sum"(COALESCE("minor_found", 0)) AS "minor_found",
    "round"("avg"("defect_rate_pct"), 2) AS "avg_defect_rate_pct",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = true)) AS "passed_inspections",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = false)) AS "failed_inspections",
    "round"(((("sum"(
        CASE
            WHEN ("qc_pass_flag" = false) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("qc_pass_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "qc_fail_rate_pct",
    "count"(*) FILTER (WHERE ("has_critical_defect" = true)) AS "inspections_with_critical",
    "count"(*) FILTER (WHERE ("has_any_production_delay" = true)) AS "inspections_with_production_delay",
    "round"("avg"("avg_delay_production_days"), 2) AS "avg_delay_production_days"
   FROM "public"."vw_qc_operacion_bridge"
  GROUP BY "customer";


ALTER VIEW "public"."vw_qc_by_customer" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_business_matrix" AS
 WITH "op" AS (
         SELECT "vw_customer_profitability_profile"."customer",
            "sum"("vw_customer_profitability_profile"."po_count") AS "po_count",
            "sum"("vw_customer_profitability_profile"."line_count") AS "line_count",
            "max"("vw_customer_profitability_profile"."factory_count") AS "factory_count",
            "max"("vw_customer_profitability_profile"."model_count") AS "model_count",
            "sum"("vw_customer_profitability_profile"."qty_total") AS "qty_total",
            "round"("sum"("vw_customer_profitability_profile"."sell_amount_total"), 2) AS "sell_amount_total",
            "round"("sum"("vw_customer_profitability_profile"."buy_amount_total"), 2) AS "buy_amount_total",
            "round"("sum"("vw_customer_profitability_profile"."margin_bsg_total"), 2) AS "margin_bsg_total",
            "round"("sum"("vw_customer_profitability_profile"."margin_xiamen_total"), 2) AS "margin_xiamen_total",
            "round"("sum"("vw_customer_profitability_profile"."contribution_total"), 2) AS "contribution_total",
            "round"((("sum"("vw_customer_profitability_profile"."contribution_total") / NULLIF("sum"("vw_customer_profitability_profile"."sell_amount_total"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
            "round"("avg"("vw_customer_profitability_profile"."xiamen_sales_mix_pct"), 2) AS "xiamen_sales_mix_pct",
            "round"("avg"("vw_customer_profitability_profile"."bsg_sales_mix_pct"), 2) AS "bsg_sales_mix_pct",
            "sum"("vw_customer_profitability_profile"."lines_with_delay_basis") AS "lines_with_delay_basis",
            "sum"("vw_customer_profitability_profile"."late_lines") AS "late_lines",
            "round"("avg"("vw_customer_profitability_profile"."avg_delay_production_days"), 2) AS "avg_delay_production_days",
            "max"("vw_customer_profitability_profile"."max_delay_production_days") AS "max_delay_production_days",
            "round"("avg"("vw_customer_profitability_profile"."production_late_rate_pct"), 2) AS "production_late_rate_pct"
           FROM "public"."vw_customer_profitability_profile"
          GROUP BY "vw_customer_profitability_profile"."customer"
        ), "logi" AS (
         SELECT "vw_exec_customer_logistics_pressure_ranking"."customer",
            "sum"("vw_exec_customer_logistics_pressure_ranking"."po_count") AS "logistics_po_count",
            "sum"("vw_exec_customer_logistics_pressure_ranking"."line_count") AS "logistics_line_count",
            "round"("avg"("vw_exec_customer_logistics_pressure_ranking"."avg_booking_delay"), 2) AS "avg_booking_delay_days",
            "max"("vw_exec_customer_logistics_pressure_ranking"."max_booking_delay") AS "max_booking_delay_days",
            "round"("avg"("vw_exec_customer_logistics_pressure_ranking"."booking_delay_rate_pct"), 2) AS "booking_delay_rate_pct",
            "round"("avg"("vw_exec_customer_logistics_pressure_ranking"."logistics_pressure_score"), 2) AS "logistics_pressure_score"
           FROM "public"."vw_exec_customer_logistics_pressure_ranking"
          GROUP BY "vw_exec_customer_logistics_pressure_ranking"."customer"
        ), "dev_conv" AS (
         SELECT "vw_dev_conversion_by_customer"."customer",
            "sum"("vw_dev_conversion_by_customer"."quote_count") AS "quote_count",
            "sum"("vw_dev_conversion_by_customer"."matched_order_count") AS "matched_order_count",
            "round"((("sum"("vw_dev_conversion_by_customer"."matched_order_count") / NULLIF("sum"("vw_dev_conversion_by_customer"."quote_count"), (0)::numeric)) * (100)::numeric), 2) AS "approx_conversion_rate_pct",
            "round"("avg"("vw_dev_conversion_by_customer"."avg_days_quote_to_order"), 2) AS "avg_days_quote_to_order",
            "round"("avg"("vw_dev_conversion_by_customer"."avg_gap_order_vs_quote_sell_pct"), 2) AS "avg_gap_order_vs_quote_sell_pct",
            "round"("avg"("vw_dev_conversion_by_customer"."avg_revision_count"), 2) AS "avg_revision_count"
           FROM "public"."vw_dev_conversion_by_customer"
          GROUP BY "vw_dev_conversion_by_customer"."customer"
        ), "dev_pressure" AS (
         SELECT "vw_dev_customer_price_pressure"."customer",
            "round"("avg"("vw_dev_customer_price_pressure"."avg_gap_vs_master_sell_pct"), 2) AS "avg_gap_vs_master_sell_pct",
            "round"("avg"("vw_dev_customer_price_pressure"."avg_quote_margin_pct"), 2) AS "avg_quote_margin_pct",
            "round"("avg"("vw_dev_customer_price_pressure"."avg_revision_count"), 2) AS "dev_avg_revision_count",
            "round"("avg"("vw_dev_customer_price_pressure"."avg_gap_order_vs_quote_sell_pct"), 2) AS "avg_gap_order_vs_quote_sell_pct",
                CASE
                    WHEN ("min"(
                    CASE "vw_dev_customer_price_pressure"."pressure_level"
                        WHEN 'HIGH_PRESSURE'::"text" THEN 3
                        WHEN 'MEDIUM_PRESSURE'::"text" THEN 2
                        ELSE 1
                    END) = 3) THEN 'HIGH_PRESSURE'::"text"
                    WHEN ("min"(
                    CASE "vw_dev_customer_price_pressure"."pressure_level"
                        WHEN 'HIGH_PRESSURE'::"text" THEN 3
                        WHEN 'MEDIUM_PRESSURE'::"text" THEN 2
                        ELSE 1
                    END) = 2) THEN 'MEDIUM_PRESSURE'::"text"
                    ELSE 'LOW_PRESSURE'::"text"
                END AS "pressure_level"
           FROM "public"."vw_dev_customer_price_pressure"
          GROUP BY "vw_dev_customer_price_pressure"."customer"
        ), "dev_neg" AS (
         SELECT "vw_dev_customer_negotiation_score"."customer",
            "round"("avg"("vw_dev_customer_negotiation_score"."negotiation_score"), 2) AS "negotiation_score",
                CASE
                    WHEN ("max"(
                    CASE "vw_dev_customer_negotiation_score"."negotiation_profile"
                        WHEN 'AGGRESSIVE'::"text" THEN 3
                        WHEN 'NORMAL'::"text" THEN 2
                        ELSE 1
                    END) = 3) THEN 'AGGRESSIVE'::"text"
                    WHEN ("max"(
                    CASE "vw_dev_customer_negotiation_score"."negotiation_profile"
                        WHEN 'AGGRESSIVE'::"text" THEN 3
                        WHEN 'NORMAL'::"text" THEN 2
                        ELSE 1
                    END) = 2) THEN 'NORMAL'::"text"
                    ELSE 'EASY'::"text"
                END AS "negotiation_profile"
           FROM "public"."vw_dev_customer_negotiation_score"
          GROUP BY "vw_dev_customer_negotiation_score"."customer"
        ), "qc" AS (
         SELECT "vw_qc_by_customer"."customer",
            "vw_qc_by_customer"."inspection_count",
            "vw_qc_by_customer"."po_count" AS "qc_po_count",
            "vw_qc_by_customer"."factory_count" AS "qc_factory_count",
            "vw_qc_by_customer"."model_count" AS "qc_model_count",
            "vw_qc_by_customer"."qty_inspected_total",
            "vw_qc_by_customer"."sell_amount_total" AS "qc_sell_amount_total",
            "vw_qc_by_customer"."contribution_total" AS "qc_contribution_total",
            "vw_qc_by_customer"."total_defects_found",
            "vw_qc_by_customer"."critical_found",
            "vw_qc_by_customer"."major_found",
            "vw_qc_by_customer"."minor_found",
            "vw_qc_by_customer"."avg_defect_rate_pct",
            "vw_qc_by_customer"."qc_fail_rate_pct",
            "vw_qc_by_customer"."inspections_with_critical",
            "vw_qc_by_customer"."inspections_with_production_delay",
            "vw_qc_by_customer"."avg_delay_production_days" AS "qc_avg_delay_production_days"
           FROM "public"."vw_qc_by_customer"
        )
 SELECT "op"."customer",
    "op"."po_count",
    "op"."line_count",
    "op"."factory_count",
    "op"."model_count",
    "op"."qty_total",
    "op"."sell_amount_total",
    "op"."buy_amount_total",
    "op"."margin_bsg_total",
    "op"."margin_xiamen_total",
    "op"."contribution_total",
    "op"."contribution_pct",
    "op"."xiamen_sales_mix_pct",
    "op"."bsg_sales_mix_pct",
    "op"."lines_with_delay_basis",
    "op"."late_lines",
    "op"."avg_delay_production_days",
    "op"."max_delay_production_days",
    "op"."production_late_rate_pct",
    "logi"."logistics_po_count",
    "logi"."logistics_line_count",
    "logi"."avg_booking_delay_days",
    "logi"."max_booking_delay_days",
    "logi"."booking_delay_rate_pct",
    "logi"."logistics_pressure_score",
    "dev_conv"."quote_count",
    "dev_conv"."matched_order_count",
    "dev_conv"."approx_conversion_rate_pct",
    "dev_conv"."avg_days_quote_to_order",
    "dev_conv"."avg_gap_order_vs_quote_sell_pct",
    "dev_conv"."avg_revision_count",
    "dev_pressure"."avg_gap_vs_master_sell_pct",
    "dev_pressure"."avg_quote_margin_pct",
    "dev_pressure"."dev_avg_revision_count",
    "dev_pressure"."pressure_level",
    "dev_neg"."negotiation_score",
    "dev_neg"."negotiation_profile",
    "qc"."inspection_count",
    "qc"."qc_po_count",
    "qc"."qty_inspected_total",
    "qc"."total_defects_found",
    "qc"."critical_found",
    "qc"."major_found",
    "qc"."minor_found",
    "qc"."avg_defect_rate_pct",
    "qc"."qc_fail_rate_pct",
    "qc"."inspections_with_critical",
    "qc"."inspections_with_production_delay",
    "round"(((((((COALESCE("op"."contribution_pct", (0)::numeric) * 0.35) + (COALESCE("dev_conv"."approx_conversion_rate_pct", (0)::numeric) * 0.15)) - (COALESCE("op"."production_late_rate_pct", (0)::numeric) * 0.15)) - (COALESCE("logi"."booking_delay_rate_pct", (0)::numeric) * 0.10)) - (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) * 0.15)) - (COALESCE("abs"("dev_neg"."negotiation_score"), (0)::numeric) * 0.10)), 2) AS "customer_business_score",
    "round"((((((COALESCE("op"."production_late_rate_pct", (0)::numeric) * 0.35) + (COALESCE("logi"."booking_delay_rate_pct", (0)::numeric) * 0.20)) + (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) * 0.25)) + (COALESCE("qc"."avg_defect_rate_pct", (0)::numeric) * 0.10)) + (COALESCE("dev_neg"."negotiation_score", (0)::numeric) * 0.10)), 2) AS "customer_friction_score",
        CASE
            WHEN (("op"."sell_amount_total" >= (1000000)::numeric) AND (COALESCE("op"."contribution_pct", (0)::numeric) >= (10)::numeric) AND (COALESCE("op"."production_late_rate_pct", (0)::numeric) <= (15)::numeric) AND (COALESCE("logi"."booking_delay_rate_pct", (0)::numeric) <= (20)::numeric) AND (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) <= (10)::numeric)) THEN 'STRATEGIC'::"text"
            WHEN ((COALESCE("dev_neg"."negotiation_profile", 'EASY'::"text") = 'AGGRESSIVE'::"text") AND (COALESCE("op"."contribution_pct", (0)::numeric) >= (8)::numeric)) THEN 'NEGOTIATOR'::"text"
            WHEN ((COALESCE("op"."production_late_rate_pct", (0)::numeric) >= (25)::numeric) OR (COALESCE("logi"."booking_delay_rate_pct", (0)::numeric) >= (35)::numeric) OR (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) >= (20)::numeric)) THEN 'RISKY'::"text"
            WHEN ((COALESCE("op"."contribution_total", (0)::numeric) >= (50000)::numeric) AND (COALESCE("op"."contribution_pct", (0)::numeric) >= (10)::numeric)) THEN 'PROFITABLE'::"text"
            ELSE 'LOW_VALUE'::"text"
        END AS "customer_business_profile"
   FROM ((((("op"
     LEFT JOIN "logi" ON (("logi"."customer" = "op"."customer")))
     LEFT JOIN "dev_conv" ON (("dev_conv"."customer" = "op"."customer")))
     LEFT JOIN "dev_pressure" ON (("dev_pressure"."customer" = "op"."customer")))
     LEFT JOIN "dev_neg" ON (("dev_neg"."customer" = "op"."customer")))
     LEFT JOIN "qc" ON (("qc"."customer" = "op"."customer")));


ALTER VIEW "public"."vw_customer_business_matrix" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_customer_ranking" AS
 SELECT "customer",
    "customer_size_band",
    "profitability_band",
    "po_count",
    "line_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "buy_amount_total",
    "margin_bsg_total",
    "margin_xiamen_total",
    "contribution_total",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "lines_with_delay_basis",
    "late_lines",
    "avg_delay_production_days",
    "max_delay_production_days",
    "production_late_rate_pct",
    "rank"() OVER (ORDER BY "contribution_total" DESC NULLS LAST) AS "rank_contribution",
    "rank"() OVER (ORDER BY "sell_amount_total" DESC NULLS LAST) AS "rank_sales",
    "rank"() OVER (ORDER BY "contribution_pct" DESC NULLS LAST) AS "rank_profitability",
    "rank"() OVER (ORDER BY "production_late_rate_pct" DESC NULLS LAST) AS "rank_delay",
        CASE
            WHEN (("contribution_total" >= (150000)::numeric) AND ("production_late_rate_pct" <= (15)::numeric)) THEN 'TOP'::"text"
            WHEN (("contribution_total" >= (75000)::numeric) AND ("production_late_rate_pct" <= (25)::numeric)) THEN 'STRONG'::"text"
            WHEN ("contribution_total" >= (25000)::numeric) THEN 'MID'::"text"
            ELSE 'LOW'::"text"
        END AS "executive_tier"
   FROM "public"."vw_customer_profitability_profile";


ALTER VIEW "public"."vw_exec_customer_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_xiamen_customer_season_volume_evolution" AS
 WITH "base" AS (
         SELECT "mv_fact_operacion_linea"."customer",
            "mv_fact_operacion_linea"."season",
            ("sum"(COALESCE("mv_fact_operacion_linea"."qty_total", 0)))::numeric AS "qty_total",
            "sum"(COALESCE("mv_fact_operacion_linea"."sell_amount_real", (0)::numeric)) AS "sell_amount_total",
            ("count"(DISTINCT "mv_fact_operacion_linea"."po_id"))::integer AS "po_count",
            ("count"(*))::integer AS "line_count"
           FROM "public"."mv_fact_operacion_linea"
          WHERE (("mv_fact_operacion_linea"."customer" IS NOT NULL) AND ("mv_fact_operacion_linea"."season" IS NOT NULL) AND ("mv_fact_operacion_linea"."operativa_code" = 'XIAMEN_DIC'::"text"))
          GROUP BY "mv_fact_operacion_linea"."customer", "mv_fact_operacion_linea"."season"
        ), "ordered" AS (
         SELECT "base"."customer",
            "base"."season",
            "base"."qty_total" AS "qty_current",
            "base"."sell_amount_total" AS "sell_current",
            "base"."po_count" AS "po_count_current",
            "base"."line_count" AS "line_count_current",
            "lag"("base"."season") OVER (PARTITION BY "base"."customer" ORDER BY "base"."season") AS "previous_season",
            "lag"("base"."qty_total") OVER (PARTITION BY "base"."customer" ORDER BY "base"."season") AS "qty_previous",
            "lag"("base"."sell_amount_total") OVER (PARTITION BY "base"."customer" ORDER BY "base"."season") AS "sell_previous",
            "lag"("base"."po_count") OVER (PARTITION BY "base"."customer" ORDER BY "base"."season") AS "po_count_previous",
            "lag"("base"."line_count") OVER (PARTITION BY "base"."customer" ORDER BY "base"."season") AS "line_count_previous"
           FROM "base"
        )
 SELECT "customer",
    "season",
    "previous_season",
    "qty_current",
    "qty_previous",
    "sell_current",
    "sell_previous",
    "po_count_current",
    "po_count_previous",
    "line_count_current",
    "line_count_previous",
        CASE
            WHEN (("qty_previous" IS NULL) OR ("qty_previous" = (0)::numeric)) THEN NULL::numeric
            ELSE "round"(((("qty_current" - "qty_previous") / "qty_previous") * 100.0), 2)
        END AS "qty_growth_pct",
        CASE
            WHEN (("sell_previous" IS NULL) OR ("sell_previous" = (0)::numeric)) THEN NULL::numeric
            ELSE "round"(((("sell_current" - "sell_previous") / "sell_previous") * 100.0), 2)
        END AS "sell_growth_pct",
        CASE
            WHEN (("po_count_previous" IS NULL) OR ("po_count_previous" = 0)) THEN NULL::numeric
            ELSE "round"((((("po_count_current")::numeric - ("po_count_previous")::numeric) / ("po_count_previous")::numeric) * 100.0), 2)
        END AS "po_count_growth_pct",
        CASE
            WHEN (("qty_previous" IS NULL) OR ("qty_previous" = (0)::numeric)) THEN 'NO_BASELINE'::"text"
            WHEN (((("qty_current" - "qty_previous") / "qty_previous") * 100.0) <= ('-30'::integer)::numeric) THEN 'VOLUME_DROP_RISK'::"text"
            WHEN (((("qty_current" - "qty_previous") / "qty_previous") * 100.0) < (0)::numeric) THEN 'VOLUME_SOFT_DROP'::"text"
            WHEN (((("qty_current" - "qty_previous") / "qty_previous") * 100.0) = (0)::numeric) THEN 'STABLE'::"text"
            WHEN (((("qty_current" - "qty_previous") / "qty_previous") * 100.0) > (0)::numeric) THEN 'GROWING'::"text"
            ELSE 'UNKNOWN'::"text"
        END AS "volume_signal"
   FROM "ordered";


ALTER VIEW "public"."vw_xiamen_customer_season_volume_evolution" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_health_signal" AS
 WITH "latest_xiamen" AS (
         SELECT DISTINCT ON ("vw_xiamen_customer_season_volume_evolution"."customer") "vw_xiamen_customer_season_volume_evolution"."customer",
            "vw_xiamen_customer_season_volume_evolution"."season",
            "vw_xiamen_customer_season_volume_evolution"."previous_season",
            "vw_xiamen_customer_season_volume_evolution"."qty_growth_pct",
            "vw_xiamen_customer_season_volume_evolution"."sell_growth_pct",
            "vw_xiamen_customer_season_volume_evolution"."volume_signal"
           FROM "public"."vw_xiamen_customer_season_volume_evolution"
          ORDER BY "vw_xiamen_customer_season_volume_evolution"."customer", "vw_xiamen_customer_season_volume_evolution"."season" DESC
        ), "base" AS (
         SELECT "bm"."customer",
            "bm"."customer_business_profile",
            "bm"."customer_business_score",
            "bm"."customer_friction_score",
            "cr"."customer_size_band",
            "cr"."profitability_band",
            "cr"."contribution_pct",
            "cr"."xiamen_sales_mix_pct",
            "cr"."bsg_sales_mix_pct",
            "lx"."season" AS "xiamen_latest_season",
            "lx"."previous_season" AS "xiamen_previous_season",
            "lx"."qty_growth_pct",
            "lx"."sell_growth_pct",
            "lx"."volume_signal"
           FROM (("public"."vw_customer_business_matrix" "bm"
             LEFT JOIN "public"."vw_exec_customer_ranking" "cr" ON (("cr"."customer" = "bm"."customer")))
             LEFT JOIN "latest_xiamen" "lx" ON (("lx"."customer" = "bm"."customer")))
        )
 SELECT "customer",
    "customer_business_profile",
    "customer_business_score",
    "customer_friction_score",
    "customer_size_band",
    "profitability_band",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "xiamen_latest_season",
    "xiamen_previous_season",
    "qty_growth_pct",
    "sell_growth_pct",
    "volume_signal",
        CASE
            WHEN ("volume_signal" = 'VOLUME_DROP_RISK'::"text") THEN 'CRITICAL'::"text"
            WHEN ("volume_signal" = 'VOLUME_SOFT_DROP'::"text") THEN 'WARNING'::"text"
            WHEN ("volume_signal" = 'GROWING'::"text") THEN 'HEALTHY'::"text"
            WHEN ("volume_signal" = ANY (ARRAY['STABLE'::"text", 'NO_BASELINE'::"text"])) THEN 'MONITOR'::"text"
            WHEN (("customer_business_profile" = 'RISKY'::"text") AND ("customer_friction_score" >= (40)::numeric)) THEN 'WARNING'::"text"
            ELSE 'NEUTRAL'::"text"
        END AS "health_signal",
        CASE
            WHEN ("volume_signal" = 'VOLUME_DROP_RISK'::"text") THEN 'Cliente Xiamen con caÃ­da crÃ­tica de volumen frente a la temporada anterior.'::"text"
            WHEN ("volume_signal" = 'VOLUME_SOFT_DROP'::"text") THEN 'Cliente Xiamen con caÃ­da moderada de volumen. Requiere seguimiento.'::"text"
            WHEN ("volume_signal" = 'GROWING'::"text") THEN 'Cliente Xiamen en crecimiento de volumen.'::"text"
            WHEN ("volume_signal" = 'STABLE'::"text") THEN 'Cliente Xiamen estable en volumen.'::"text"
            WHEN ("volume_signal" = 'NO_BASELINE'::"text") THEN 'Cliente Xiamen sin temporada anterior comparable.'::"text"
            WHEN (("customer_business_profile" = 'RISKY'::"text") AND ("customer_friction_score" >= (40)::numeric)) THEN 'Cliente con fricciÃ³n elevada segÃºn la matriz de negocio.'::"text"
            ELSE 'Sin seÃ±al crÃ­tica especÃ­fica.'::"text"
        END AS "health_reason",
        CASE
            WHEN ("xiamen_sales_mix_pct" >= (70)::numeric) THEN true
            ELSE false
        END AS "xiamen_context_flag"
   FROM "base";


ALTER VIEW "public"."vw_customer_health_signal" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_business_contextual" AS
 SELECT "customer",
    "customer_business_profile" AS "raw_business_profile",
    "customer_business_score" AS "raw_business_score",
    "customer_friction_score",
    "health_signal",
    "health_reason",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "xiamen_context_flag",
    "customer_size_band",
    "profitability_band",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
        CASE
            WHEN (("xiamen_context_flag" = true) AND ("volume_signal" = 'VOLUME_DROP_RISK'::"text")) THEN 'CRITICAL_XIAMEN'::"text"
            WHEN (("xiamen_context_flag" = true) AND ("volume_signal" = 'VOLUME_SOFT_DROP'::"text")) THEN 'WATCH_XIAMEN'::"text"
            WHEN (("xiamen_context_flag" = true) AND ("volume_signal" = 'GROWING'::"text")) THEN 'GROWING_XIAMEN'::"text"
            WHEN (("xiamen_context_flag" = true) AND ("volume_signal" = 'NO_BASELINE'::"text")) THEN 'NEW_OR_UNTRACKED_XIAMEN'::"text"
            WHEN ("xiamen_context_flag" = true) THEN 'DEMANDING_XIAMEN'::"text"
            ELSE "customer_business_profile"
        END AS "contextual_business_profile",
        CASE
            WHEN ("xiamen_context_flag" = true) THEN (
            CASE
                WHEN ("volume_signal" = 'VOLUME_DROP_RISK'::"text") THEN '-100'::integer
                WHEN ("volume_signal" = 'VOLUME_SOFT_DROP'::"text") THEN '-40'::integer
                WHEN ("volume_signal" = 'NO_BASELINE'::"text") THEN 0
                WHEN ("volume_signal" = 'STABLE'::"text") THEN 40
                WHEN ("volume_signal" = 'GROWING'::"text") THEN 80
                ELSE 0
            END)::numeric
            ELSE "customer_business_score"
        END AS "contextual_business_score",
        CASE
            WHEN ("xiamen_context_flag" = true) THEN 'XIAMEN_VOLUME_BASED'::"text"
            ELSE 'STANDARD_BUSINESS_MATRIX'::"text"
        END AS "score_model",
        CASE
            WHEN ("health_signal" = 'CRITICAL'::"text") THEN 1
            WHEN ("health_signal" = 'WARNING'::"text") THEN 2
            WHEN ("health_signal" = 'MONITOR'::"text") THEN 3
            WHEN ("health_signal" = 'HEALTHY'::"text") THEN 4
            WHEN ("health_signal" = 'NEUTRAL'::"text") THEN 5
            ELSE 9
        END AS "health_priority"
   FROM "public"."vw_customer_health_signal" "hs";


ALTER VIEW "public"."vw_customer_business_contextual" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_commercial_alerts" AS
 WITH "base" AS (
         SELECT "c"."customer",
            "c"."contextual_business_profile",
            "c"."contextual_business_score",
            "c"."customer_friction_score",
            "c"."health_signal",
            "c"."health_reason",
            "c"."volume_signal",
            "c"."qty_growth_pct",
            "c"."sell_growth_pct",
            "c"."xiamen_context_flag",
            "c"."customer_size_band",
            "c"."profitability_band",
            "c"."contribution_pct",
            "c"."xiamen_sales_mix_pct",
            "c"."bsg_sales_mix_pct",
            "c"."score_model",
            "c"."health_priority"
           FROM "public"."vw_customer_business_contextual" "c"
        ), "alerts" AS (
         SELECT "base"."customer",
                CASE
                    WHEN ("base"."health_signal" = 'CRITICAL'::"text") THEN 'CRITICAL'::"text"
                    WHEN ("base"."health_signal" = 'WARNING'::"text") THEN 'WARNING'::"text"
                    WHEN ("base"."health_signal" = 'MONITOR'::"text") THEN 'MONITOR'::"text"
                    ELSE NULL::"text"
                END AS "alert_level",
                CASE
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_DROP_RISK'::"text")) THEN 'XIAMEN_VOLUME_DROP'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_SOFT_DROP'::"text")) THEN 'XIAMEN_VOLUME_SOFT_DROP'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'NO_BASELINE'::"text")) THEN 'XIAMEN_NO_BASELINE'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contextual_business_profile" = 'RISKY'::"text") AND ("base"."customer_friction_score" >= (70)::numeric)) THEN 'HIGH_FRICTION_RISK'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."profitability_band" = 'LOW'::"text")) THEN 'LOW_PROFITABILITY'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contribution_pct" IS NOT NULL) AND ("base"."contribution_pct" < 0.10)) THEN 'LOW_CONTRIBUTION'::"text"
                    WHEN ("base"."health_signal" = 'WARNING'::"text") THEN 'COMMERCIAL_WARNING'::"text"
                    WHEN ("base"."health_signal" = 'MONITOR'::"text") THEN 'MONITOR_CUSTOMER'::"text"
                    ELSE NULL::"text"
                END AS "alert_type",
                CASE
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_DROP_RISK'::"text")) THEN 'CaÃ­da crÃ­tica de volumen Xiamen frente a la temporada anterior.'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_SOFT_DROP'::"text")) THEN 'CaÃ­da moderada de volumen Xiamen frente a la temporada anterior.'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'NO_BASELINE'::"text")) THEN 'Cliente Xiamen sin baseline suficiente para comparar evoluciÃ³n.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contextual_business_profile" = 'RISKY'::"text") AND ("base"."customer_friction_score" >= (70)::numeric)) THEN 'Cliente con alta fricciÃ³n operativa y perfil de riesgo.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."profitability_band" = 'LOW'::"text")) THEN 'Cliente con rentabilidad baja segÃºn matriz de negocio.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contribution_pct" IS NOT NULL) AND ("base"."contribution_pct" < 0.10)) THEN 'Cliente con contribuciÃ³n baja.'::"text"
                    WHEN ("base"."health_signal" = 'WARNING'::"text") THEN COALESCE("base"."health_reason", 'Cliente con seÃ±al comercial de advertencia.'::"text")
                    WHEN ("base"."health_signal" = 'MONITOR'::"text") THEN COALESCE("base"."health_reason", 'Cliente en seguimiento.'::"text")
                    ELSE NULL::"text"
                END AS "alert_reason",
                CASE
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_DROP_RISK'::"text")) THEN 'Revisar pipeline de prÃ³xima temporada y contactar al cliente para entender la caÃ­da.'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'VOLUME_SOFT_DROP'::"text")) THEN 'Monitorizar evoluciÃ³n y validar si la caÃ­da responde a calendario, booking o pÃ©rdida de demanda.'::"text"
                    WHEN (("base"."xiamen_context_flag" = true) AND ("base"."volume_signal" = 'NO_BASELINE'::"text")) THEN 'Mantener seguimiento hasta disponer de comparaciÃ³n entre temporadas.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contextual_business_profile" = 'RISKY'::"text") AND ("base"."customer_friction_score" >= (70)::numeric)) THEN 'Revisar condiciones operativas, carga de coordinaciÃ³n y rentabilidad antes de aceptar mÃ¡s volumen.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."profitability_band" = 'LOW'::"text")) THEN 'Revisar pricing, margen objetivo y condiciones comerciales.'::"text"
                    WHEN (("base"."xiamen_context_flag" = false) AND ("base"."contribution_pct" IS NOT NULL) AND ("base"."contribution_pct" < 0.10)) THEN 'Analizar margen por pedido y valorar renegociaciÃ³n de precios.'::"text"
                    WHEN ("base"."health_signal" = 'WARNING'::"text") THEN 'Revisar el detalle del cliente y validar causa principal antes de nueva campaÃ±a comercial.'::"text"
                    WHEN ("base"."health_signal" = 'MONITOR'::"text") THEN 'Mantener seguimiento en prÃ³ximas temporadas.'::"text"
                    ELSE NULL::"text"
                END AS "recommended_action",
                CASE
                    WHEN ("base"."health_signal" = 'CRITICAL'::"text") THEN 1
                    WHEN ("base"."health_signal" = 'WARNING'::"text") THEN 2
                    WHEN ("base"."health_signal" = 'MONITOR'::"text") THEN 3
                    ELSE 9
                END AS "alert_priority",
            "base"."contextual_business_profile",
            "base"."contextual_business_score",
            "base"."customer_friction_score",
            "base"."health_signal",
            "base"."health_reason",
            "base"."volume_signal",
            "base"."qty_growth_pct",
            "base"."sell_growth_pct",
            "base"."xiamen_context_flag",
            "base"."customer_size_band",
            "base"."profitability_band",
            "base"."contribution_pct",
            "base"."xiamen_sales_mix_pct",
            "base"."bsg_sales_mix_pct",
            "base"."score_model",
            "base"."health_priority"
           FROM "base"
        )
 SELECT "customer",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "alert_priority",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "health_reason",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "xiamen_context_flag",
    "customer_size_band",
    "profitability_band",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "score_model",
    "health_priority"
   FROM "alerts"
  WHERE (("alert_level" IS NOT NULL) AND ("alert_type" IS NOT NULL))
  ORDER BY "alert_priority", "contextual_business_score", "customer";


ALTER VIEW "public"."vw_customer_commercial_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_intelligence_signals_v1" AS
 WITH "customer_health" AS (
         SELECT "vw_customer_business_contextual"."customer",
            "vw_customer_business_contextual"."health_signal" AS "alert_level",
            'CUSTOMER_HEALTH'::"text" AS "alert_type",
            "vw_customer_business_contextual"."health_reason" AS "alert_reason",
                CASE
                    WHEN ("vw_customer_business_contextual"."health_signal" = 'CRITICAL'::"text") THEN 'Revisar cliente prioritario'::"text"
                    WHEN ("vw_customer_business_contextual"."health_signal" = 'WARNING'::"text") THEN 'Validar riesgo comercial u operativo'::"text"
                    WHEN ("vw_customer_business_contextual"."health_signal" = 'MONITOR'::"text") THEN 'Seguir evoluciÃ³n'::"text"
                    WHEN ("vw_customer_business_contextual"."health_signal" = 'HEALTHY'::"text") THEN 'Detectar oportunidad de crecimiento'::"text"
                    ELSE 'Sin acciÃ³n prioritaria'::"text"
                END AS "recommended_action",
            "vw_customer_business_contextual"."health_priority" AS "alert_priority",
            "vw_customer_business_contextual"."contextual_business_profile",
            "vw_customer_business_contextual"."contextual_business_score",
            "vw_customer_business_contextual"."customer_friction_score",
            "vw_customer_business_contextual"."health_signal",
            "vw_customer_business_contextual"."health_reason",
            "vw_customer_business_contextual"."volume_signal",
            "vw_customer_business_contextual"."qty_growth_pct",
            "vw_customer_business_contextual"."sell_growth_pct",
            "vw_customer_business_contextual"."xiamen_context_flag",
            "vw_customer_business_contextual"."customer_size_band",
            "vw_customer_business_contextual"."profitability_band",
            "vw_customer_business_contextual"."contribution_pct",
            "vw_customer_business_contextual"."xiamen_sales_mix_pct",
            "vw_customer_business_contextual"."bsg_sales_mix_pct",
            "vw_customer_business_contextual"."score_model",
            "vw_customer_business_contextual"."health_priority",
            'CUSTOMER'::"text" AS "source_module"
           FROM "public"."vw_customer_business_contextual"
          WHERE ("vw_customer_business_contextual"."health_signal" = ANY (ARRAY['CRITICAL'::"text", 'WARNING'::"text", 'MONITOR'::"text", 'HEALTHY'::"text"]))
        ), "commercial_alerts" AS (
         SELECT "vw_customer_commercial_alerts"."customer",
            "vw_customer_commercial_alerts"."alert_level",
            "vw_customer_commercial_alerts"."alert_type",
            "vw_customer_commercial_alerts"."alert_reason",
            "vw_customer_commercial_alerts"."recommended_action",
            "vw_customer_commercial_alerts"."alert_priority",
            "vw_customer_commercial_alerts"."contextual_business_profile",
            "vw_customer_commercial_alerts"."contextual_business_score",
            "vw_customer_commercial_alerts"."customer_friction_score",
            "vw_customer_commercial_alerts"."health_signal",
            "vw_customer_commercial_alerts"."health_reason",
            "vw_customer_commercial_alerts"."volume_signal",
            "vw_customer_commercial_alerts"."qty_growth_pct",
            "vw_customer_commercial_alerts"."sell_growth_pct",
            "vw_customer_commercial_alerts"."xiamen_context_flag",
            "vw_customer_commercial_alerts"."customer_size_band",
            "vw_customer_commercial_alerts"."profitability_band",
            "vw_customer_commercial_alerts"."contribution_pct",
            "vw_customer_commercial_alerts"."xiamen_sales_mix_pct",
            "vw_customer_commercial_alerts"."bsg_sales_mix_pct",
            "vw_customer_commercial_alerts"."score_model",
            "vw_customer_commercial_alerts"."health_priority",
            'COMMERCIAL'::"text" AS "source_module"
           FROM "public"."vw_customer_commercial_alerts"
          WHERE ("vw_customer_commercial_alerts"."alert_level" = ANY (ARRAY['CRITICAL'::"text", 'WARNING'::"text", 'MONITOR'::"text"]))
        )
 SELECT "customer_health"."customer",
    "customer_health"."alert_level",
    "customer_health"."alert_type",
    "customer_health"."alert_reason",
    "customer_health"."recommended_action",
    "customer_health"."alert_priority",
    "customer_health"."contextual_business_profile",
    "customer_health"."contextual_business_score",
    "customer_health"."customer_friction_score",
    "customer_health"."health_signal",
    "customer_health"."health_reason",
    "customer_health"."volume_signal",
    "customer_health"."qty_growth_pct",
    "customer_health"."sell_growth_pct",
    "customer_health"."xiamen_context_flag",
    "customer_health"."customer_size_band",
    "customer_health"."profitability_band",
    "customer_health"."contribution_pct",
    "customer_health"."xiamen_sales_mix_pct",
    "customer_health"."bsg_sales_mix_pct",
    "customer_health"."score_model",
    "customer_health"."health_priority",
    "customer_health"."source_module"
   FROM "customer_health"
UNION ALL
 SELECT "commercial_alerts"."customer",
    "commercial_alerts"."alert_level",
    "commercial_alerts"."alert_type",
    "commercial_alerts"."alert_reason",
    "commercial_alerts"."recommended_action",
    "commercial_alerts"."alert_priority",
    "commercial_alerts"."contextual_business_profile",
    "commercial_alerts"."contextual_business_score",
    "commercial_alerts"."customer_friction_score",
    "commercial_alerts"."health_signal",
    "commercial_alerts"."health_reason",
    "commercial_alerts"."volume_signal",
    "commercial_alerts"."qty_growth_pct",
    "commercial_alerts"."sell_growth_pct",
    "commercial_alerts"."xiamen_context_flag",
    "commercial_alerts"."customer_size_band",
    "commercial_alerts"."profitability_band",
    "commercial_alerts"."contribution_pct",
    "commercial_alerts"."xiamen_sales_mix_pct",
    "commercial_alerts"."bsg_sales_mix_pct",
    "commercial_alerts"."score_model",
    "commercial_alerts"."health_priority",
    "commercial_alerts"."source_module"
   FROM "commercial_alerts";


ALTER VIEW "public"."vw_exec_intelligence_signals_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_intelligence_focus_v1" AS
 SELECT DISTINCT ON ("customer") "customer",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "alert_priority",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "health_reason",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "xiamen_context_flag",
    "customer_size_band",
    "profitability_band",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "score_model",
    "health_priority",
    "source_module"
   FROM "public"."vw_exec_intelligence_signals_v1"
  ORDER BY "customer", "alert_priority",
        CASE "source_module"
            WHEN 'COMMERCIAL'::"text" THEN 1
            WHEN 'CUSTOMER'::"text" THEN 2
            ELSE 9
        END, "contextual_business_score";


ALTER VIEW "public"."vw_exec_intelligence_focus_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_cross_module_risk_v3" AS
 WITH "base" AS (
         SELECT "i"."customer",
            "i"."alert_level",
            "i"."alert_type",
            "i"."alert_reason",
            "i"."recommended_action",
            "i"."alert_priority",
            "i"."contextual_business_profile",
            "i"."contextual_business_score",
            "i"."customer_friction_score",
            "i"."health_signal",
            "i"."volume_signal",
            "i"."qty_growth_pct",
            "i"."sell_growth_pct",
            "i"."score_model",
            "c"."po_count",
            "c"."line_count",
            "c"."factory_count",
            "c"."model_count",
            "c"."qty_total",
            "c"."sell_amount_total",
            "c"."contribution_total",
            "c"."contribution_pct",
            "c"."production_late_rate_pct",
            "c"."avg_delay_production_days",
            "c"."max_delay_production_days",
            "c"."executive_tier",
            "d"."negotiation_score",
            "d"."negotiation_profile",
            "d"."avg_revisions",
            "d"."avg_days_to_order"
           FROM (("public"."vw_exec_intelligence_focus_v1" "i"
             LEFT JOIN "public"."vw_exec_customer_ranking" "c" ON (("c"."customer" = "i"."customer")))
             LEFT JOIN "public"."vw_dev_customer_negotiation_score" "d" ON (("d"."customer" = "i"."customer")))
        ), "scored" AS (
         SELECT "base"."customer",
            "base"."alert_level",
            "base"."alert_type",
            "base"."alert_reason",
            "base"."recommended_action",
            "base"."alert_priority",
            "base"."contextual_business_profile",
            "base"."contextual_business_score",
            "base"."customer_friction_score",
            "base"."health_signal",
            "base"."volume_signal",
            "base"."qty_growth_pct",
            "base"."sell_growth_pct",
            "base"."score_model",
            "base"."po_count",
            "base"."line_count",
            "base"."factory_count",
            "base"."model_count",
            "base"."qty_total",
            "base"."sell_amount_total",
            "base"."contribution_total",
            "base"."contribution_pct",
            "base"."production_late_rate_pct",
            "base"."avg_delay_production_days",
            "base"."max_delay_production_days",
            "base"."executive_tier",
            "base"."negotiation_score",
            "base"."negotiation_profile",
            "base"."avg_revisions",
            "base"."avg_days_to_order",
                CASE
                    WHEN ("base"."alert_level" = 'CRITICAL'::"text") THEN 45
                    WHEN ("base"."alert_level" = 'WARNING'::"text") THEN 25
                    WHEN ("base"."alert_level" = 'MONITOR'::"text") THEN 10
                    ELSE 0
                END AS "commercial_risk_points",
                CASE
                    WHEN ("base"."production_late_rate_pct" >= (60)::numeric) THEN 35
                    WHEN ("base"."production_late_rate_pct" >= (40)::numeric) THEN 25
                    WHEN ("base"."production_late_rate_pct" >= (20)::numeric) THEN 15
                    WHEN ("base"."production_late_rate_pct" >= (10)::numeric) THEN 8
                    ELSE 0
                END AS "production_risk_points",
                CASE
                    WHEN ("base"."contribution_pct" < (8)::numeric) THEN 18
                    WHEN ("base"."contribution_pct" < (10)::numeric) THEN 12
                    WHEN ("base"."contribution_pct" < (12)::numeric) THEN 8
                    ELSE 0
                END AS "margin_risk_points",
                CASE
                    WHEN ("base"."negotiation_profile" = 'AGGRESSIVE'::"text") THEN 15
                    WHEN ("base"."negotiation_profile" = 'NORMAL'::"text") THEN 5
                    ELSE 0
                END AS "development_risk_points",
                CASE
                    WHEN (("base"."factory_count" = 1) AND ("base"."sell_amount_total" > (0)::numeric)) THEN 10
                    ELSE 0
                END AS "concentration_risk_points"
           FROM "base"
        ), "drivers" AS (
         SELECT "scored"."customer",
            "scored"."alert_level",
            "scored"."alert_type",
            "scored"."alert_reason",
            "scored"."recommended_action",
            "scored"."alert_priority",
            "scored"."contextual_business_profile",
            "scored"."contextual_business_score",
            "scored"."customer_friction_score",
            "scored"."health_signal",
            "scored"."volume_signal",
            "scored"."qty_growth_pct",
            "scored"."sell_growth_pct",
            "scored"."score_model",
            "scored"."po_count",
            "scored"."line_count",
            "scored"."factory_count",
            "scored"."model_count",
            "scored"."qty_total",
            "scored"."sell_amount_total",
            "scored"."contribution_total",
            "scored"."contribution_pct",
            "scored"."production_late_rate_pct",
            "scored"."avg_delay_production_days",
            "scored"."max_delay_production_days",
            "scored"."executive_tier",
            "scored"."negotiation_score",
            "scored"."negotiation_profile",
            "scored"."avg_revisions",
            "scored"."avg_days_to_order",
            "scored"."commercial_risk_points",
            "scored"."production_risk_points",
            "scored"."margin_risk_points",
            "scored"."development_risk_points",
            "scored"."concentration_risk_points",
            GREATEST("scored"."commercial_risk_points", "scored"."production_risk_points", "scored"."margin_risk_points", "scored"."development_risk_points", "scored"."concentration_risk_points") AS "max_driver_points",
            (((("scored"."commercial_risk_points" + "scored"."production_risk_points") + "scored"."margin_risk_points") + "scored"."development_risk_points") + "scored"."concentration_risk_points") AS "raw_risk_score"
           FROM "scored"
        ), "classified" AS (
         SELECT "drivers"."customer",
            "drivers"."alert_level",
            "drivers"."alert_type",
            "drivers"."alert_reason",
            "drivers"."recommended_action",
            "drivers"."alert_priority",
            "drivers"."contextual_business_profile",
            "drivers"."contextual_business_score",
            "drivers"."customer_friction_score",
            "drivers"."health_signal",
            "drivers"."volume_signal",
            "drivers"."qty_growth_pct",
            "drivers"."sell_growth_pct",
            "drivers"."score_model",
            "drivers"."po_count",
            "drivers"."line_count",
            "drivers"."factory_count",
            "drivers"."model_count",
            "drivers"."qty_total",
            "drivers"."sell_amount_total",
            "drivers"."contribution_total",
            "drivers"."contribution_pct",
            "drivers"."production_late_rate_pct",
            "drivers"."avg_delay_production_days",
            "drivers"."max_delay_production_days",
            "drivers"."executive_tier",
            "drivers"."negotiation_score",
            "drivers"."negotiation_profile",
            "drivers"."avg_revisions",
            "drivers"."avg_days_to_order",
            "drivers"."commercial_risk_points",
            "drivers"."production_risk_points",
            "drivers"."margin_risk_points",
            "drivers"."development_risk_points",
            "drivers"."concentration_risk_points",
            "drivers"."max_driver_points",
            "drivers"."raw_risk_score",
            LEAST(100, "drivers"."raw_risk_score") AS "cross_module_risk_score",
                CASE
                    WHEN ("drivers"."commercial_risk_points" = "drivers"."max_driver_points") THEN 'COMMERCIAL'::"text"
                    WHEN ("drivers"."production_risk_points" = "drivers"."max_driver_points") THEN 'PRODUCTION'::"text"
                    WHEN ("drivers"."margin_risk_points" = "drivers"."max_driver_points") THEN 'MARGIN'::"text"
                    WHEN ("drivers"."development_risk_points" = "drivers"."max_driver_points") THEN 'DEVELOPMENT'::"text"
                    WHEN ("drivers"."concentration_risk_points" = "drivers"."max_driver_points") THEN 'CONCENTRATION'::"text"
                    ELSE 'NONE'::"text"
                END AS "primary_driver",
                CASE
                    WHEN ("drivers"."alert_level" = 'CRITICAL'::"text") THEN 'CRITICAL'::"text"
                    WHEN (("drivers"."raw_risk_score" >= 85) AND ("drivers"."commercial_risk_points" >= 25) AND ("drivers"."production_risk_points" >= 25)) THEN 'CRITICAL'::"text"
                    WHEN ("drivers"."raw_risk_score" >= 45) THEN 'WARNING'::"text"
                    WHEN ("drivers"."raw_risk_score" >= 25) THEN 'MONITOR'::"text"
                    ELSE 'HEALTHY'::"text"
                END AS "cross_module_risk_level"
           FROM "drivers"
        )
 SELECT "customer",
    "cross_module_risk_score",
    "cross_module_risk_level",
    "primary_driver",
        CASE
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text") AND ("production_risk_points" >= 15)) THEN 'Cliente con seÃ±al comercial crÃ­tica y riesgo operativo elevado.'::"text"
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text")) THEN 'Cliente con seÃ±al comercial crÃ­tica.'::"text"
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'PRODUCTION'::"text")) THEN 'Cliente con combinaciÃ³n crÃ­tica de riesgo operativo y comercial.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("primary_driver" = 'PRODUCTION'::"text") AND ("production_risk_points" >= 35)) THEN 'Cliente con riesgo operativo severo por retrasos de producciÃ³n.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text") AND ("production_risk_points" >= 25)) THEN 'Cliente con warning comercial y retrasos de producciÃ³n significativos.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text")) THEN 'Cliente con warning comercial relevante.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("primary_driver" = 'MARGIN'::"text")) THEN 'Cliente con presiÃ³n de margen relevante.'::"text"
            WHEN (("cross_module_risk_level" = 'MONITOR'::"text") AND ("primary_driver" = 'CONCENTRATION'::"text")) THEN 'Cliente con dependencia elevada de una Ãºnica fÃ¡brica.'::"text"
            WHEN ("cross_module_risk_level" = 'MONITOR'::"text") THEN 'Cliente para seguimiento por seÃ±ales moderadas.'::"text"
            ELSE 'Cliente sin riesgo cross-module elevado.'::"text"
        END AS "executive_summary",
        CASE
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text")) THEN 'Revisar situaciÃ³n comercial inmediatamente y preparar acciÃ³n con cliente.'::"text"
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'PRODUCTION'::"text")) THEN 'Revisar plan de producciÃ³n, fÃ¡brica responsable y fechas comprometidas.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("production_risk_points" >= 25)) THEN 'Coordinar seguimiento comercial y operativo antes de nuevas decisiones.'::"text"
            WHEN ("cross_module_risk_level" = 'WARNING'::"text") THEN 'Revisar causa principal del riesgo antes de nueva campaÃ±a.'::"text"
            WHEN ("cross_module_risk_level" = 'MONITOR'::"text") THEN 'Mantener seguimiento en prÃ³ximos ciclos.'::"text"
            ELSE 'Sin acciÃ³n urgente.'::"text"
        END AS "recommended_cross_module_action",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "commercial_risk_points",
    "production_risk_points",
    "margin_risk_points",
    "development_risk_points",
    "concentration_risk_points",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "score_model",
    "po_count",
    "line_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "contribution_pct",
    "production_late_rate_pct",
    "avg_delay_production_days",
    "max_delay_production_days",
    "executive_tier",
    "negotiation_score",
    "negotiation_profile",
    "avg_revisions",
    "avg_days_to_order"
   FROM "classified"
  ORDER BY
        CASE "cross_module_risk_level"
            WHEN 'CRITICAL'::"text" THEN 1
            WHEN 'WARNING'::"text" THEN 2
            WHEN 'MONITOR'::"text" THEN 3
            WHEN 'HEALTHY'::"text" THEN 4
            ELSE 9
        END, "cross_module_risk_score" DESC, "customer";


ALTER VIEW "public"."vw_exec_cross_module_risk_v3" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_cross_module_correlations_v1" AS
 WITH "base" AS (
         SELECT "cm"."customer",
            "cm"."cross_module_risk_score",
            "cm"."cross_module_risk_level",
            "cm"."primary_driver",
            "cm"."executive_summary",
            "cm"."recommended_cross_module_action",
            "cm"."commercial_risk_points",
            "cm"."production_risk_points",
            "cm"."margin_risk_points",
            "cm"."development_risk_points",
            "cm"."concentration_risk_points",
            "cm"."contribution_pct",
            "cm"."production_late_rate_pct",
            "cm"."factory_count",
            "cm"."alert_level",
            "cm"."negotiation_profile"
           FROM "public"."vw_exec_cross_module_risk_v3" "cm"
        ), "signals" AS (
         SELECT "base"."customer",
            'GROWTH_UNDER_STRESS'::"text" AS "correlation_type",
            'WARNING'::"text" AS "severity",
            'Cliente con crecimiento o margen razonable, pero con deterioro operativo.'::"text" AS "correlation_reason",
            70 AS "correlation_score"
           FROM "base"
          WHERE (("base"."contribution_pct" >= (10)::numeric) AND ("base"."production_late_rate_pct" >= (25)::numeric))
        UNION ALL
         SELECT "base"."customer",
            'MARGIN_PRESSURE'::"text" AS "text",
                CASE
                    WHEN ("base"."margin_risk_points" >= 18) THEN 'CRITICAL'::"text"
                    ELSE 'WARNING'::"text"
                END AS "case",
            'Cliente con presiÃ³n relevante de margen.'::"text" AS "text",
                CASE
                    WHEN ("base"."margin_risk_points" >= 18) THEN 85
                    ELSE 65
                END AS "case"
           FROM "base"
          WHERE ("base"."margin_risk_points" >= 12)
        UNION ALL
         SELECT "base"."customer",
            'FACTORY_DEPENDENCY_RISK'::"text" AS "text",
            'WARNING'::"text" AS "text",
            'Cliente con dependencia elevada de una Ãºnica fÃ¡brica.'::"text" AS "text",
            60 AS "int4"
           FROM "base"
          WHERE (("base"."factory_count" <= 1) AND ("base"."contribution_pct" >= (8)::numeric))
        UNION ALL
         SELECT "base"."customer",
            'COMMERCIAL_OPERATIONAL_DIVERGENCE'::"text" AS "text",
            'CRITICAL'::"text" AS "text",
            'SeÃ±al comercial crÃ­tica combinada con deterioro operativo.'::"text" AS "text",
            90 AS "int4"
           FROM "base"
          WHERE (("base"."commercial_risk_points" >= 40) AND ("base"."production_risk_points" >= 15))
        UNION ALL
         SELECT "base"."customer",
            'HIGH_VALUE_OPERATIONAL_RISK'::"text" AS "text",
            'CRITICAL'::"text" AS "text",
            'Cliente de alto valor con riesgo operativo elevado.'::"text" AS "text",
            88 AS "int4"
           FROM "base"
          WHERE (("base"."contribution_pct" >= (15)::numeric) AND ("base"."production_late_rate_pct" >= (40)::numeric))
        UNION ALL
         SELECT "base"."customer",
            'NEGOTIATION_MARGIN_PRESSURE'::"text" AS "text",
            'MONITOR'::"text" AS "text",
            'FricciÃ³n de negociaciÃ³n combinada con presiÃ³n de margen.'::"text" AS "text",
            55 AS "int4"
           FROM "base"
          WHERE (("base"."negotiation_profile" = 'AGGRESSIVE'::"text") AND ("base"."margin_risk_points" >= 8))
        )
 SELECT "customer",
    "correlation_type",
    "severity",
    "correlation_reason",
    "correlation_score"
   FROM "signals"
  ORDER BY "correlation_score" DESC, "customer";


ALTER VIEW "public"."vw_exec_cross_module_correlations_v1" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_exec_cross_module_correlations_fast" AS
 SELECT "customer",
    "correlation_type",
    "severity",
    "correlation_reason",
    "correlation_score"
   FROM "public"."vw_exec_cross_module_correlations_v1"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_exec_cross_module_correlations_fast" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_exec_cross_module_risk_fast" AS
 SELECT "customer",
    "cross_module_risk_score",
    "cross_module_risk_level",
    "primary_driver",
    "executive_summary",
    "recommended_cross_module_action",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "commercial_risk_points",
    "production_risk_points",
    "margin_risk_points",
    "development_risk_points",
    "concentration_risk_points",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "score_model",
    "po_count",
    "line_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "contribution_pct",
    "production_late_rate_pct",
    "avg_delay_production_days",
    "max_delay_production_days",
    "executive_tier",
    "negotiation_score",
    "negotiation_profile",
    "avg_revisions",
    "avg_days_to_order"
   FROM "public"."vw_exec_cross_module_risk_v3"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_exec_cross_module_risk_fast" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_action_lifecycle_v1" AS
 SELECT "id",
    "action_key",
    "customer",
    "factory",
    "season",
    "module",
    "priority",
    "status",
    "title",
    "owner_label",
    "first_detected_at",
    "last_seen_at",
    "created_at",
    "updated_at",
    "resolved_at",
    "due_date",
    (EXTRACT(day FROM ("now"() - "created_at")))::integer AS "age_days",
    (EXTRACT(day FROM ("now"() - "updated_at")))::integer AS "days_since_update",
        CASE
            WHEN ("resolved_at" IS NOT NULL) THEN (EXTRACT(day FROM ("resolved_at" - "created_at")))::integer
            ELSE NULL::integer
        END AS "resolution_days",
        CASE
            WHEN (("owner_label" IS NULL) OR (TRIM(BOTH FROM "owner_label") = ''::"text")) THEN true
            ELSE false
        END AS "without_owner_flag",
        CASE
            WHEN (("status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) AND ("priority" = 'CRITICAL'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "updated_at")))::integer >= 7)) THEN true
            ELSE false
        END AS "stale_critical_flag",
        CASE
            WHEN (("status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) AND ((EXTRACT(day FROM ("now"() - "updated_at")))::integer >= 14)) THEN true
            ELSE false
        END AS "stale_action_flag",
        CASE
            WHEN (("status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) AND ("priority" = 'CRITICAL'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "created_at")))::integer >= 14)) THEN true
            WHEN (("status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) AND ("priority" = 'HIGH'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "created_at")))::integer >= 21)) THEN true
            ELSE false
        END AS "escalation_flag",
        CASE
            WHEN (("status" = ANY (ARRAY['RESOLVED'::"public"."executive_action_status", 'DISMISSED'::"public"."executive_action_status"])) AND ("last_seen_at" > COALESCE("resolved_at", "updated_at"))) THEN true
            ELSE false
        END AS "reopen_candidate_flag",
        CASE
            WHEN ("status" = ANY (ARRAY['RESOLVED'::"public"."executive_action_status", 'DISMISSED'::"public"."executive_action_status"])) THEN 'CLOSED'::"text"
            WHEN (("priority" = 'CRITICAL'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "created_at")))::integer <= 3)) THEN 'CRITICAL_NEW'::"text"
            WHEN (("priority" = 'CRITICAL'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "created_at")))::integer <= 7)) THEN 'CRITICAL_ACTIVE'::"text"
            WHEN ("priority" = 'CRITICAL'::"public"."executive_action_priority") THEN 'CRITICAL_AGING'::"text"
            WHEN (("priority" = 'HIGH'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "created_at")))::integer <= 7)) THEN 'HIGH_ACTIVE'::"text"
            WHEN ("priority" = 'HIGH'::"public"."executive_action_priority") THEN 'HIGH_AGING'::"text"
            WHEN ("status" = 'WAITING'::"public"."executive_action_status") THEN 'WAITING_EXTERNAL'::"text"
            ELSE 'NORMAL'::"text"
        END AS "sla_bucket",
        CASE
            WHEN ("status" = ANY (ARRAY['RESOLVED'::"public"."executive_action_status", 'DISMISSED'::"public"."executive_action_status"])) THEN 9
            WHEN (("priority" = 'CRITICAL'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "updated_at")))::integer >= 7)) THEN 1
            WHEN ("priority" = 'CRITICAL'::"public"."executive_action_priority") THEN 2
            WHEN (("priority" = 'HIGH'::"public"."executive_action_priority") AND ((EXTRACT(day FROM ("now"() - "updated_at")))::integer >= 14)) THEN 3
            WHEN ("priority" = 'HIGH'::"public"."executive_action_priority") THEN 4
            WHEN (("owner_label" IS NULL) OR (TRIM(BOTH FROM "owner_label") = ''::"text")) THEN 5
            ELSE 6
        END AS "lifecycle_priority_rank",
    ( SELECT "count"(*) AS "count"
           FROM "public"."executive_action_notes" "n"
          WHERE ("n"."action_id" = "ea"."id")) AS "notes_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."executive_action_decisions" "d"
          WHERE ("d"."action_id" = "ea"."id")) AS "decisions_count"
   FROM "public"."executive_actions" "ea";


ALTER VIEW "public"."vw_exec_action_lifecycle_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_cross_module_risk_v1" AS
 WITH "base" AS (
         SELECT "i"."customer",
            "i"."alert_level",
            "i"."alert_type",
            "i"."alert_reason",
            "i"."recommended_action",
            "i"."alert_priority",
            "i"."contextual_business_profile",
            "i"."contextual_business_score",
            "i"."customer_friction_score",
            "i"."health_signal",
            "i"."volume_signal",
            "i"."qty_growth_pct",
            "i"."sell_growth_pct",
            "i"."score_model",
            "c"."po_count",
            "c"."line_count",
            "c"."factory_count",
            "c"."model_count",
            "c"."qty_total",
            "c"."sell_amount_total",
            "c"."contribution_total",
            "c"."contribution_pct",
            "c"."production_late_rate_pct",
            "c"."avg_delay_production_days",
            "c"."max_delay_production_days",
            "c"."executive_tier",
            "d"."negotiation_score",
            "d"."negotiation_profile",
            "d"."avg_revisions",
            "d"."avg_days_to_order"
           FROM (("public"."vw_exec_intelligence_focus_v1" "i"
             LEFT JOIN "public"."vw_exec_customer_ranking" "c" ON (("c"."customer" = "i"."customer")))
             LEFT JOIN "public"."vw_dev_customer_negotiation_score" "d" ON (("d"."customer" = "i"."customer")))
        ), "scored" AS (
         SELECT "base"."customer",
            "base"."alert_level",
            "base"."alert_type",
            "base"."alert_reason",
            "base"."recommended_action",
            "base"."alert_priority",
            "base"."contextual_business_profile",
            "base"."contextual_business_score",
            "base"."customer_friction_score",
            "base"."health_signal",
            "base"."volume_signal",
            "base"."qty_growth_pct",
            "base"."sell_growth_pct",
            "base"."score_model",
            "base"."po_count",
            "base"."line_count",
            "base"."factory_count",
            "base"."model_count",
            "base"."qty_total",
            "base"."sell_amount_total",
            "base"."contribution_total",
            "base"."contribution_pct",
            "base"."production_late_rate_pct",
            "base"."avg_delay_production_days",
            "base"."max_delay_production_days",
            "base"."executive_tier",
            "base"."negotiation_score",
            "base"."negotiation_profile",
            "base"."avg_revisions",
            "base"."avg_days_to_order",
                CASE
                    WHEN ("base"."alert_level" = 'CRITICAL'::"text") THEN 40
                    WHEN ("base"."alert_level" = 'WARNING'::"text") THEN 25
                    WHEN ("base"."alert_level" = 'MONITOR'::"text") THEN 10
                    ELSE 0
                END AS "commercial_risk_points",
                CASE
                    WHEN ("base"."production_late_rate_pct" >= (40)::numeric) THEN 25
                    WHEN ("base"."production_late_rate_pct" >= (20)::numeric) THEN 15
                    WHEN ("base"."production_late_rate_pct" >= (10)::numeric) THEN 8
                    ELSE 0
                END AS "production_risk_points",
                CASE
                    WHEN ("base"."contribution_pct" < (8)::numeric) THEN 15
                    WHEN ("base"."contribution_pct" < (12)::numeric) THEN 8
                    ELSE 0
                END AS "margin_risk_points",
                CASE
                    WHEN ("base"."negotiation_profile" = 'AGGRESSIVE'::"text") THEN 15
                    WHEN ("base"."negotiation_profile" = 'NORMAL'::"text") THEN 5
                    ELSE 0
                END AS "development_risk_points",
                CASE
                    WHEN (("base"."factory_count" = 1) AND ("base"."sell_amount_total" > (0)::numeric)) THEN 10
                    ELSE 0
                END AS "concentration_risk_points"
           FROM "base"
        )
 SELECT "customer",
    LEAST(100, (((("commercial_risk_points" + "production_risk_points") + "margin_risk_points") + "development_risk_points") + "concentration_risk_points")) AS "cross_module_risk_score",
        CASE
            WHEN (LEAST(100, (((("commercial_risk_points" + "production_risk_points") + "margin_risk_points") + "development_risk_points") + "concentration_risk_points")) >= 70) THEN 'CRITICAL'::"text"
            WHEN (LEAST(100, (((("commercial_risk_points" + "production_risk_points") + "margin_risk_points") + "development_risk_points") + "concentration_risk_points")) >= 45) THEN 'WARNING'::"text"
            WHEN (LEAST(100, (((("commercial_risk_points" + "production_risk_points") + "margin_risk_points") + "development_risk_points") + "concentration_risk_points")) >= 25) THEN 'MONITOR'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "cross_module_risk_level",
        CASE
            WHEN ("commercial_risk_points" >= GREATEST("production_risk_points", "margin_risk_points", "development_risk_points", "concentration_risk_points")) THEN 'COMMERCIAL'::"text"
            WHEN ("production_risk_points" >= GREATEST("commercial_risk_points", "margin_risk_points", "development_risk_points", "concentration_risk_points")) THEN 'PRODUCTION'::"text"
            WHEN ("margin_risk_points" >= GREATEST("commercial_risk_points", "production_risk_points", "development_risk_points", "concentration_risk_points")) THEN 'MARGIN'::"text"
            WHEN ("development_risk_points" >= GREATEST("commercial_risk_points", "production_risk_points", "margin_risk_points", "concentration_risk_points")) THEN 'DEVELOPMENT'::"text"
            ELSE 'CONCENTRATION'::"text"
        END AS "primary_driver",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "commercial_risk_points",
    "production_risk_points",
    "margin_risk_points",
    "development_risk_points",
    "concentration_risk_points",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "score_model",
    "po_count",
    "line_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "contribution_pct",
    "production_late_rate_pct",
    "avg_delay_production_days",
    "max_delay_production_days",
    "executive_tier",
    "negotiation_score",
    "negotiation_profile",
    "avg_revisions",
    "avg_days_to_order",
        CASE
            WHEN (("alert_level" = 'CRITICAL'::"text") AND ("production_late_rate_pct" >= (20)::numeric)) THEN 'Cliente con seÃ±al comercial crÃ­tica y riesgo operativo elevado.'::"text"
            WHEN ("alert_level" = 'CRITICAL'::"text") THEN 'Cliente con seÃ±al comercial crÃ­tica.'::"text"
            WHEN ("production_late_rate_pct" >= (40)::numeric) THEN 'Cliente con riesgo operativo elevado por retrasos de producciÃ³n.'::"text"
            WHEN ("contribution_pct" < (8)::numeric) THEN 'Cliente con presiÃ³n de margen relevante.'::"text"
            WHEN ("negotiation_profile" = 'AGGRESSIVE'::"text") THEN 'Cliente con fricciÃ³n alta en desarrollo y negociaciÃ³n.'::"text"
            WHEN ("factory_count" = 1) THEN 'Cliente con dependencia elevada de una Ãºnica fÃ¡brica.'::"text"
            ELSE 'Cliente sin riesgo cross-module elevado.'::"text"
        END AS "executive_summary"
   FROM "scored"
  ORDER BY LEAST(100, (((("commercial_risk_points" + "production_risk_points") + "margin_risk_points") + "development_risk_points") + "concentration_risk_points")) DESC, "customer";


ALTER VIEW "public"."vw_exec_cross_module_risk_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_resolution_analytics_v1" AS
 WITH "base" AS (
         SELECT "ea"."id",
            "ea"."action_key",
            "ea"."customer",
            "ea"."module",
            "ea"."source_type",
            "ea"."priority",
            "ea"."status",
            "ea"."owner_label",
            "ea"."created_at",
            "ea"."updated_at",
            "ea"."first_detected_at",
            "ea"."last_seen_at",
            "ea"."resolved_at",
                CASE
                    WHEN ("ea"."resolved_at" IS NOT NULL) THEN (EXTRACT(day FROM ("ea"."resolved_at" - "ea"."created_at")))::integer
                    ELSE NULL::integer
                END AS "resolution_days",
                CASE
                    WHEN ("ea"."status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) THEN (EXTRACT(day FROM ("now"() - "ea"."created_at")))::integer
                    ELSE NULL::integer
                END AS "open_age_days",
                CASE
                    WHEN ("ea"."status" = ANY (ARRAY['RESOLVED'::"public"."executive_action_status", 'DISMISSED'::"public"."executive_action_status"])) THEN true
                    ELSE false
                END AS "closed_flag",
                CASE
                    WHEN ("ea"."status" = 'RESOLVED'::"public"."executive_action_status") THEN true
                    ELSE false
                END AS "resolved_flag",
                CASE
                    WHEN ("ea"."status" = 'DISMISSED'::"public"."executive_action_status") THEN true
                    ELSE false
                END AS "dismissed_flag",
                CASE
                    WHEN ("ea"."status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])) THEN true
                    ELSE false
                END AS "active_flag",
                CASE
                    WHEN ("ea"."metadata" ? 'reopened_at'::"text") THEN true
                    ELSE false
                END AS "reopened_flag",
            COALESCE(NULLIF(("ea"."metadata" ->> 'primary_driver'::"text"), ''::"text"), 'UNKNOWN'::"text") AS "primary_driver",
            COALESCE(NULLIF(("ea"."metadata" ->> 'alert_type'::"text"), ''::"text"), 'UNKNOWN'::"text") AS "alert_type",
            COALESCE(NULLIF(("ea"."metadata" ->> 'health_signal'::"text"), ''::"text"), 'UNKNOWN'::"text") AS "health_signal",
            COALESCE(NULLIF(("ea"."metadata" ->> 'volume_signal'::"text"), ''::"text"), 'UNKNOWN'::"text") AS "volume_signal"
           FROM "public"."executive_actions" "ea"
        ), "notes" AS (
         SELECT "executive_action_notes"."action_id",
            "count"(*) AS "notes_count",
            "max"("executive_action_notes"."created_at") AS "last_note_at"
           FROM "public"."executive_action_notes"
          GROUP BY "executive_action_notes"."action_id"
        ), "decisions" AS (
         SELECT "executive_action_decisions"."action_id",
            "count"(*) AS "decisions_count",
            "max"("executive_action_decisions"."created_at") AS "last_decision_at"
           FROM "public"."executive_action_decisions"
          GROUP BY "executive_action_decisions"."action_id"
        )
 SELECT "b"."id",
    "b"."action_key",
    "b"."customer",
    "b"."module",
    "b"."source_type",
    "b"."priority",
    "b"."status",
    "b"."owner_label",
    "b"."created_at",
    "b"."updated_at",
    "b"."first_detected_at",
    "b"."last_seen_at",
    "b"."resolved_at",
    "b"."resolution_days",
    "b"."open_age_days",
    "b"."closed_flag",
    "b"."resolved_flag",
    "b"."dismissed_flag",
    "b"."active_flag",
    "b"."reopened_flag",
    "b"."primary_driver",
    "b"."alert_type",
    "b"."health_signal",
    "b"."volume_signal",
    COALESCE("n"."notes_count", (0)::bigint) AS "notes_count",
    "n"."last_note_at",
    COALESCE("d"."decisions_count", (0)::bigint) AS "decisions_count",
    "d"."last_decision_at",
        CASE
            WHEN ("b"."active_flag" AND (COALESCE("n"."notes_count", (0)::bigint) = 0) AND (COALESCE("d"."decisions_count", (0)::bigint) = 0)) THEN true
            ELSE false
        END AS "no_followup_flag",
        CASE
            WHEN ("b"."resolved_flag" AND ("b"."resolution_days" <= 7)) THEN 'FAST'::"text"
            WHEN ("b"."resolved_flag" AND ("b"."resolution_days" <= 21)) THEN 'NORMAL'::"text"
            WHEN ("b"."resolved_flag" AND ("b"."resolution_days" > 21)) THEN 'SLOW'::"text"
            WHEN ("b"."active_flag" AND ("b"."open_age_days" <= 7)) THEN 'ACTIVE_NEW'::"text"
            WHEN ("b"."active_flag" AND ("b"."open_age_days" <= 21)) THEN 'ACTIVE_AGING'::"text"
            WHEN ("b"."active_flag" AND ("b"."open_age_days" > 21)) THEN 'ACTIVE_STALE'::"text"
            ELSE 'UNKNOWN'::"text"
        END AS "resolution_bucket",
        CASE
            WHEN ("b"."active_flag" AND ("b"."priority" = 'CRITICAL'::"public"."executive_action_priority") AND ("b"."open_age_days" > 14)) THEN true
            WHEN ("b"."active_flag" AND ("b"."priority" = 'HIGH'::"public"."executive_action_priority") AND ("b"."open_age_days" > 21)) THEN true
            ELSE false
        END AS "resolution_risk_flag"
   FROM (("base" "b"
     LEFT JOIN "notes" "n" ON (("n"."action_id" = "b"."id")))
     LEFT JOIN "decisions" "d" ON (("d"."action_id" = "b"."id")));


ALTER VIEW "public"."vw_exec_resolution_analytics_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_resolution_kpis_v1" AS
 WITH "base" AS (
         SELECT "vw_exec_resolution_analytics_v1"."id",
            "vw_exec_resolution_analytics_v1"."action_key",
            "vw_exec_resolution_analytics_v1"."customer",
            "vw_exec_resolution_analytics_v1"."module",
            "vw_exec_resolution_analytics_v1"."source_type",
            "vw_exec_resolution_analytics_v1"."priority",
            "vw_exec_resolution_analytics_v1"."status",
            "vw_exec_resolution_analytics_v1"."owner_label",
            "vw_exec_resolution_analytics_v1"."created_at",
            "vw_exec_resolution_analytics_v1"."updated_at",
            "vw_exec_resolution_analytics_v1"."first_detected_at",
            "vw_exec_resolution_analytics_v1"."last_seen_at",
            "vw_exec_resolution_analytics_v1"."resolved_at",
            "vw_exec_resolution_analytics_v1"."resolution_days",
            "vw_exec_resolution_analytics_v1"."open_age_days",
            "vw_exec_resolution_analytics_v1"."closed_flag",
            "vw_exec_resolution_analytics_v1"."resolved_flag",
            "vw_exec_resolution_analytics_v1"."dismissed_flag",
            "vw_exec_resolution_analytics_v1"."active_flag",
            "vw_exec_resolution_analytics_v1"."reopened_flag",
            "vw_exec_resolution_analytics_v1"."primary_driver",
            "vw_exec_resolution_analytics_v1"."alert_type",
            "vw_exec_resolution_analytics_v1"."health_signal",
            "vw_exec_resolution_analytics_v1"."volume_signal",
            "vw_exec_resolution_analytics_v1"."notes_count",
            "vw_exec_resolution_analytics_v1"."last_note_at",
            "vw_exec_resolution_analytics_v1"."decisions_count",
            "vw_exec_resolution_analytics_v1"."last_decision_at",
            "vw_exec_resolution_analytics_v1"."no_followup_flag",
            "vw_exec_resolution_analytics_v1"."resolution_bucket",
            "vw_exec_resolution_analytics_v1"."resolution_risk_flag"
           FROM "public"."vw_exec_resolution_analytics_v1"
        ), "summary" AS (
         SELECT "count"(*) AS "total_actions",
            "count"(*) FILTER (WHERE ("base"."active_flag" = true)) AS "active_actions",
            "count"(*) FILTER (WHERE ("base"."resolved_flag" = true)) AS "resolved_actions",
            "count"(*) FILTER (WHERE ("base"."dismissed_flag" = true)) AS "dismissed_actions",
            "count"(*) FILTER (WHERE ("base"."no_followup_flag" = true)) AS "no_followup_actions",
            "count"(*) FILTER (WHERE ("base"."reopened_flag" = true)) AS "reopened_actions",
            "count"(*) FILTER (WHERE ("base"."resolution_risk_flag" = true)) AS "resolution_risk_actions",
            "count"(*) FILTER (WHERE ("base"."resolution_bucket" = 'ACTIVE_STALE'::"text")) AS "stale_actions",
            "avg"("base"."resolution_days") FILTER (WHERE ("base"."resolved_flag" = true)) AS "avg_resolution_days",
            "max"("base"."open_age_days") FILTER (WHERE ("base"."active_flag" = true)) AS "max_open_age_days"
           FROM "base"
        ), "owner_rank" AS (
         SELECT "base"."owner_label",
            "count"(*) AS "owner_action_count"
           FROM "base"
          WHERE (("base"."owner_label" IS NOT NULL) AND (TRIM(BOTH FROM "base"."owner_label") <> ''::"text"))
          GROUP BY "base"."owner_label"
          ORDER BY ("count"(*)) DESC, "base"."owner_label"
         LIMIT 1
        ), "driver_rank" AS (
         SELECT "base"."primary_driver",
            "count"(*) AS "driver_action_count"
           FROM "base"
          GROUP BY "base"."primary_driver"
          ORDER BY ("count"(*)) DESC, "base"."primary_driver"
         LIMIT 1
        )
 SELECT "summary"."total_actions",
    "summary"."active_actions",
    "summary"."resolved_actions",
    "summary"."dismissed_actions",
    "summary"."no_followup_actions",
    "summary"."reopened_actions",
    "summary"."resolution_risk_actions",
    "summary"."stale_actions",
    "summary"."avg_resolution_days",
    "summary"."max_open_age_days",
    "owner_rank"."owner_label" AS "top_owner",
    "owner_rank"."owner_action_count",
    "driver_rank"."primary_driver" AS "top_driver",
    "driver_rank"."driver_action_count",
        CASE
            WHEN ("summary"."resolution_risk_actions" > 0) THEN 'CRITICAL'::"text"
            WHEN ("summary"."stale_actions" > 0) THEN 'CRITICAL'::"text"
            WHEN ("summary"."no_followup_actions" > 0) THEN 'WARNING'::"text"
            WHEN ("summary"."active_actions" > 0) THEN 'ACTIVE'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "workflow_resolution_health",
        CASE
            WHEN ("summary"."resolution_risk_actions" > 0) THEN 40
            WHEN ("summary"."stale_actions" > 0) THEN 55
            WHEN ("summary"."no_followup_actions" > 0) THEN 70
            WHEN ("summary"."active_actions" > 0) THEN 85
            ELSE 100
        END AS "workflow_resolution_score"
   FROM (("summary"
     LEFT JOIN "owner_rank" ON (true))
     LEFT JOIN "driver_rank" ON (true));


ALTER VIEW "public"."vw_exec_resolution_kpis_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_morning_brief_v1" AS
 WITH "workflow" AS (
         SELECT "count"(*) FILTER (WHERE (("vw_exec_action_lifecycle_v1"."priority" = 'CRITICAL'::"public"."executive_action_priority") AND ("vw_exec_action_lifecycle_v1"."status" = ANY (ARRAY['OPEN'::"public"."executive_action_status", 'IN_PROGRESS'::"public"."executive_action_status", 'WAITING'::"public"."executive_action_status"])))) AS "critical_open",
            "count"(*) FILTER (WHERE ("vw_exec_action_lifecycle_v1"."without_owner_flag" = true)) AS "without_owner",
            "count"(*) FILTER (WHERE ("vw_exec_action_lifecycle_v1"."stale_critical_flag" = true)) AS "stale_critical",
            "count"(*) FILTER (WHERE ("vw_exec_action_lifecycle_v1"."escalation_flag" = true)) AS "escalations"
           FROM "public"."vw_exec_action_lifecycle_v1"
        ), "top_risk" AS (
         SELECT "vw_exec_cross_module_risk_v1"."customer",
            "vw_exec_cross_module_risk_v1"."cross_module_risk_level",
            "vw_exec_cross_module_risk_v1"."cross_module_risk_score",
            "vw_exec_cross_module_risk_v1"."executive_summary"
           FROM "public"."vw_exec_cross_module_risk_v1"
          ORDER BY
                CASE "vw_exec_cross_module_risk_v1"."cross_module_risk_level"
                    WHEN 'CRITICAL'::"text" THEN 1
                    WHEN 'WARNING'::"text" THEN 2
                    ELSE 3
                END, "vw_exec_cross_module_risk_v1"."cross_module_risk_score" DESC
         LIMIT 1
        ), "portfolio" AS (
         SELECT "count"(*) FILTER (WHERE ("vw_exec_cross_module_risk_v1"."cross_module_risk_level" = 'CRITICAL'::"text")) AS "critical_customers",
            "count"(*) FILTER (WHERE ("vw_exec_cross_module_risk_v1"."cross_module_risk_level" = 'WARNING'::"text")) AS "warning_customers"
           FROM "public"."vw_exec_cross_module_risk_v1"
        ), "resolution" AS (
         SELECT "vw_exec_resolution_kpis_v1"."total_actions",
            "vw_exec_resolution_kpis_v1"."active_actions",
            "vw_exec_resolution_kpis_v1"."resolved_actions",
            "vw_exec_resolution_kpis_v1"."dismissed_actions",
            "vw_exec_resolution_kpis_v1"."no_followup_actions",
            "vw_exec_resolution_kpis_v1"."reopened_actions",
            "vw_exec_resolution_kpis_v1"."resolution_risk_actions",
            "vw_exec_resolution_kpis_v1"."stale_actions",
            "vw_exec_resolution_kpis_v1"."avg_resolution_days",
            "vw_exec_resolution_kpis_v1"."max_open_age_days",
            "vw_exec_resolution_kpis_v1"."top_owner",
            "vw_exec_resolution_kpis_v1"."owner_action_count",
            "vw_exec_resolution_kpis_v1"."top_driver",
            "vw_exec_resolution_kpis_v1"."driver_action_count",
            "vw_exec_resolution_kpis_v1"."workflow_resolution_health",
            "vw_exec_resolution_kpis_v1"."workflow_resolution_score"
           FROM "public"."vw_exec_resolution_kpis_v1"
        )
 SELECT "now"() AS "generated_at",
    "workflow"."critical_open",
    "workflow"."without_owner",
    "workflow"."stale_critical",
    "workflow"."escalations",
    "portfolio"."critical_customers",
    "portfolio"."warning_customers",
    "resolution"."total_actions",
    "resolution"."active_actions",
    "resolution"."resolved_actions",
    "resolution"."no_followup_actions",
    "resolution"."reopened_actions",
    "resolution"."resolution_risk_actions",
    "resolution"."stale_actions",
    "resolution"."avg_resolution_days",
    "resolution"."max_open_age_days",
    "resolution"."top_owner",
    "resolution"."top_driver",
    "resolution"."workflow_resolution_health",
    "resolution"."workflow_resolution_score",
    "top_risk"."customer" AS "top_customer",
    "top_risk"."cross_module_risk_level" AS "top_customer_risk_level",
    "top_risk"."cross_module_risk_score" AS "top_customer_risk_score",
    "top_risk"."executive_summary" AS "top_customer_summary",
        CASE
            WHEN ("resolution"."workflow_resolution_health" = 'CRITICAL'::"text") THEN 'CRITICAL'::"text"
            WHEN ("workflow"."stale_critical" > 0) THEN 'CRITICAL'::"text"
            WHEN ("workflow"."escalations" > 0) THEN 'CRITICAL'::"text"
            WHEN ("resolution"."workflow_resolution_health" = 'WARNING'::"text") THEN 'WARNING'::"text"
            WHEN ("workflow"."without_owner" > 0) THEN 'WARNING'::"text"
            WHEN ("portfolio"."critical_customers" > 0) THEN 'WARNING'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "executive_health",
        CASE
            WHEN ("resolution"."resolution_risk_actions" > 0) THEN (("resolution"."resolution_risk_actions")::"text" || ' acciones presentan riesgo de resoluciÃ³n.'::"text")
            WHEN ("resolution"."stale_actions" > 0) THEN (("resolution"."stale_actions")::"text" || ' acciones estÃ¡n stale y requieren revisiÃ³n.'::"text")
            WHEN ("workflow"."stale_critical" > 0) THEN (("workflow"."stale_critical")::"text" || ' acciones crÃ­ticas requieren atenciÃ³n inmediata.'::"text")
            WHEN ("workflow"."escalations" > 0) THEN (("workflow"."escalations")::"text" || ' acciones requieren escalaciÃ³n ejecutiva.'::"text")
            WHEN ("resolution"."no_followup_actions" > 0) THEN (("resolution"."no_followup_actions")::"text" || ' acciones siguen sin seguimiento registrado.'::"text")
            WHEN ("workflow"."without_owner" > 0) THEN (("workflow"."without_owner")::"text" || ' acciones siguen sin owner asignado.'::"text")
            WHEN ("portfolio"."critical_customers" > 0) THEN (('Existen '::"text" || ("portfolio"."critical_customers")::"text") || ' clientes en situaciÃ³n crÃ­tica.'::"text")
            ELSE 'No existen alertas crÃ­ticas activas.'::"text"
        END AS "executive_headline",
        CASE
            WHEN ("top_risk"."customer" IS NOT NULL) THEN ("top_risk"."customer" || ' continÃºa siendo el principal foco ejecutivo.'::"text")
            ELSE 'No hay focos prioritarios detectados.'::"text"
        END AS "executive_focus",
        CASE
            WHEN ("resolution"."workflow_resolution_health" = 'CRITICAL'::"text") THEN (('La salud de resoluciÃ³n estÃ¡ en CRITICAL con score '::"text" || ("resolution"."workflow_resolution_score")::"text") || '.'::"text")
            WHEN ("resolution"."workflow_resolution_health" = 'WARNING'::"text") THEN (('La salud de resoluciÃ³n estÃ¡ en WARNING con score '::"text" || ("resolution"."workflow_resolution_score")::"text") || '.'::"text")
            WHEN ("resolution"."workflow_resolution_health" = 'ACTIVE'::"text") THEN (('La salud de resoluciÃ³n estÃ¡ activa y bajo control con score '::"text" || ("resolution"."workflow_resolution_score")::"text") || '.'::"text")
            ELSE (('La salud de resoluciÃ³n estÃ¡ estable con score '::"text" || ("resolution"."workflow_resolution_score")::"text") || '.'::"text")
        END AS "resolution_summary"
   FROM ((("workflow"
     CROSS JOIN "portfolio")
     CROSS JOIN "resolution")
     LEFT JOIN "top_risk" ON (true));


ALTER VIEW "public"."vw_exec_morning_brief_v1" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_exec_morning_brief_fast" AS
 SELECT "generated_at",
    "critical_open",
    "without_owner",
    "stale_critical",
    "escalations",
    "critical_customers",
    "warning_customers",
    "total_actions",
    "active_actions",
    "resolved_actions",
    "no_followup_actions",
    "reopened_actions",
    "resolution_risk_actions",
    "stale_actions",
    "avg_resolution_days",
    "max_open_age_days",
    "top_owner",
    "top_driver",
    "workflow_resolution_health",
    "workflow_resolution_score",
    "top_customer",
    "top_customer_risk_level",
    "top_customer_risk_score",
    "top_customer_summary",
    "executive_health",
    "executive_headline",
    "executive_focus",
    "resolution_summary"
   FROM "public"."vw_exec_morning_brief_v1"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_exec_morning_brief_fast" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_fact_operacion_linea_v2" AS
 WITH "base" AS (
         SELECT "lp"."id" AS "linea_pedido_id",
            "lp"."po_id",
            "p"."po" AS "po_number",
            "p"."supplier",
            "p"."customer",
            "p"."factory",
            "p"."season",
            COALESCE("lp"."channel", "p"."channel") AS "channel",
            "lp"."modelo_id",
            "lp"."variante_id",
            "lp"."reference",
            "lp"."style",
            "lp"."color",
            "lp"."size_run",
            "lp"."category",
            "p"."po_date",
            "p"."etd_pi",
            "p"."shipping_date",
            "lp"."finish_date",
            "lp"."etd",
            "lp"."inspection" AS "inspection_date",
                CASE
                    WHEN (("lp"."pi_bsg" IS NOT NULL) AND ("btrim"("lp"."pi_bsg") <> ''::"text")) THEN 'BSG'::"text"
                    ELSE 'XIAMEN_DIC'::"text"
                END AS "operativa_code",
                CASE
                    WHEN (("lp"."pi_bsg" IS NOT NULL) AND ("btrim"("lp"."pi_bsg") <> ''::"text")) THEN 'BUY_SELL'::"text"
                    ELSE 'COMMISSION'::"text"
                END AS "operativa_family",
            "lp"."pi_bsg",
            "lp"."qty",
            "lp"."price",
            "lp"."amount",
            "lp"."price_selling",
            "lp"."amount_selling",
            "lp"."created_at",
            "lp"."updated_at",
            "p"."created_at" AS "po_created_at",
            "p"."updated_at" AS "po_updated_at"
           FROM ("public"."lineas_pedido" "lp"
             JOIN "public"."pos" "p" ON (("p"."id" = "lp"."po_id")))
          WHERE ("lp"."estado" = 'ACTIVA'::"text")
        )
 SELECT "linea_pedido_id",
    "po_id",
    "po_number",
    "supplier",
    "customer",
    "factory",
    "season",
    "channel",
    "modelo_id",
    "variante_id",
    "reference",
    "style",
    "color",
    "size_run",
    "category",
    "po_date",
    "etd_pi",
    "shipping_date",
    "finish_date",
    "etd",
    "inspection_date",
    "operativa_code",
    "operativa_family",
    "pi_bsg",
    "qty",
    "price",
    "amount",
    "price_selling",
    "amount_selling",
    "created_at",
    "updated_at",
    "po_created_at",
    "po_updated_at",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
            ELSE COALESCE("amount", (0)::numeric)
        END AS "sell_amount_real",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount", (0)::numeric)
            ELSE NULL::numeric
        END AS "buy_amount_real",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN (COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric))
            ELSE (0)::numeric
        END AS "margin_base_amount",
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "round"((COALESCE("amount", (0)::numeric) * 0.10), 2)
            ELSE (0)::numeric
        END AS "commission_amount",
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "round"(((COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric)) + (COALESCE("amount", (0)::numeric) * 0.10)), 2)
            ELSE (0)::numeric
        END AS "margin_total_amount",
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "round"((COALESCE("amount", (0)::numeric) * 0.10), 2)
            WHEN ("operativa_code" = 'BSG'::"text") THEN "round"(((COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric)) + (COALESCE("amount", (0)::numeric) * 0.10)), 2)
            ELSE (0)::numeric
        END AS "contribution_amount",
        CASE
            WHEN (
            CASE
                WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
                ELSE COALESCE("amount", (0)::numeric)
            END > (0)::numeric) THEN "round"(((
            CASE
                WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN (COALESCE("amount", (0)::numeric) * 0.10)
                WHEN ("operativa_code" = 'BSG'::"text") THEN ((COALESCE("amount_selling", (0)::numeric) - COALESCE("amount", (0)::numeric)) + (COALESCE("amount", (0)::numeric) * 0.10))
                ELSE (0)::numeric
            END /
            CASE
                WHEN ("operativa_code" = 'BSG'::"text") THEN COALESCE("amount_selling", (0)::numeric)
                ELSE COALESCE("amount", (0)::numeric)
            END) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "contribution_pct"
   FROM "base"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_fact_operacion_linea_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_active_seasons" (
    "season" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."production_active_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_defect_action_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "defect_id" "uuid" NOT NULL,
    "action_plan" "text",
    "action_owner" "text",
    "action_due_date" "date",
    "action_status" "text",
    "changed_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qc_defect_action_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_defect_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "defect_id" "uuid",
    "photo_url" "text" NOT NULL,
    "photo_name" "text",
    "photo_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qc_defect_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_pps_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_id" "uuid",
    "reference" "text",
    "style" "text",
    "color" "text",
    "photo_url" "text" NOT NULL,
    "photo_name" "text",
    "photo_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qc_pps_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_customer_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_customer_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'OPERATOR'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text", 'OPERATOR'::"text", 'VIEWER'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_alertas_candidatas" AS
 WITH "parsed_muestras" AS (
         SELECT "m"."id",
            "m"."linea_pedido_id",
            "m"."tipo_muestra",
                CASE
                    WHEN (("m"."fecha_muestra")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("m"."fecha_muestra")::"text", 'YYYY-MM-DD'::"text")
                    WHEN (("m"."fecha_muestra")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("m"."fecha_muestra")::"text", 'DD/MM/YYYY'::"text")
                    ELSE NULL::"date"
                END AS "fecha_real",
                CASE
                    WHEN (("m"."fecha_teorica")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("m"."fecha_teorica")::"text", 'YYYY-MM-DD'::"text")
                    WHEN (("m"."fecha_teorica")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("m"."fecha_teorica")::"text", 'DD/MM/YYYY'::"text")
                    ELSE NULL::"date"
                END AS "fecha_teorica"
           FROM "public"."muestras" "m"
        )
 SELECT 'muestra'::"text" AS "tipo",
    "pm"."tipo_muestra" AS "subtipo",
    "pm"."fecha_real",
    "pm"."fecha_teorica",
    "lp"."id" AS "linea_pedido_id",
    "p"."id" AS "po_id",
    COALESCE("pm"."fecha_real", "pm"."fecha_teorica") AS "fecha_alerta",
    ("pm"."fecha_real" IS NULL) AS "es_estimada"
   FROM (("parsed_muestras" "pm"
     JOIN "public"."lineas_pedido" "lp" ON (("lp"."id" = "pm"."linea_pedido_id")))
     JOIN "public"."pos" "p" ON (("p"."id" = "lp"."po_id")))
  WHERE ((("pm"."fecha_real" >= CURRENT_DATE) AND ("pm"."fecha_real" <= (CURRENT_DATE + 7))) OR (("pm"."fecha_real" IS NULL) AND (("pm"."fecha_teorica" >= CURRENT_DATE) AND ("pm"."fecha_teorica" <= (CURRENT_DATE + 7)))))
UNION ALL
 SELECT 'produccion'::"text" AS "tipo",
    "sub"."etapa" AS "subtipo",
    "sub"."fecha_real",
    "sub"."fecha_estimada" AS "fecha_teorica",
    "lp"."id" AS "linea_pedido_id",
    "p"."id" AS "po_id",
    COALESCE(("sub"."fecha_real")::timestamp without time zone, "sub"."fecha_estimada") AS "fecha_alerta",
    ("sub"."fecha_real" IS NULL) AS "es_estimada"
   FROM ((( SELECT "lp_1"."id",
            "p_1"."id" AS "po_id",
            'Trial Upper'::"text" AS "etapa",
                CASE
                    WHEN ("lp_1"."trial_upper" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"("lp_1"."trial_upper", 'YYYY-MM-DD'::"text")
                    WHEN ("lp_1"."trial_upper" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"("lp_1"."trial_upper", 'DD/MM/YYYY'::"text")
                    ELSE NULL::"date"
                END AS "fecha_real",
                CASE
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'YYYY-MM-DD'::"text") - '10 days'::interval)
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'DD/MM/YYYY'::"text") - '10 days'::interval)
                    ELSE NULL::timestamp without time zone
                END AS "fecha_estimada"
           FROM ("public"."lineas_pedido" "lp_1"
             JOIN "public"."pos" "p_1" ON (("p_1"."id" = "lp_1"."po_id")))
        UNION ALL
         SELECT "lp_1"."id",
            "p_1"."id" AS "po_id",
            'Trial Lasting'::"text" AS "etapa",
                CASE
                    WHEN ("lp_1"."trial_lasting" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"("lp_1"."trial_lasting", 'YYYY-MM-DD'::"text")
                    WHEN ("lp_1"."trial_lasting" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"("lp_1"."trial_lasting", 'DD/MM/YYYY'::"text")
                    ELSE NULL::"date"
                END AS "fecha_real",
                CASE
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'YYYY-MM-DD'::"text") - '9 days'::interval)
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'DD/MM/YYYY'::"text") - '9 days'::interval)
                    ELSE NULL::timestamp without time zone
                END AS "fecha_estimada"
           FROM ("public"."lineas_pedido" "lp_1"
             JOIN "public"."pos" "p_1" ON (("p_1"."id" = "lp_1"."po_id")))
        UNION ALL
         SELECT "lp_1"."id",
            "p_1"."id" AS "po_id",
            'Lasting'::"text" AS "etapa",
                CASE
                    WHEN ("lp_1"."lasting" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"("lp_1"."lasting", 'YYYY-MM-DD'::"text")
                    WHEN ("lp_1"."lasting" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"("lp_1"."lasting", 'DD/MM/YYYY'::"text")
                    ELSE NULL::"date"
                END AS "fecha_real",
                CASE
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'YYYY-MM-DD'::"text") - '11 days'::interval)
                    WHEN (("p_1"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN ("to_date"(("p_1"."etd_pi")::"text", 'DD/MM/YYYY'::"text") - '11 days'::interval)
                    ELSE NULL::timestamp without time zone
                END AS "fecha_estimada"
           FROM ("public"."lineas_pedido" "lp_1"
             JOIN "public"."pos" "p_1" ON (("p_1"."id" = "lp_1"."po_id")))) "sub"
     JOIN "public"."lineas_pedido" "lp" ON (("lp"."id" = "sub"."id")))
     JOIN "public"."pos" "p" ON (("p"."id" = "lp"."po_id")))
  WHERE ((("sub"."fecha_real" >= CURRENT_DATE) AND ("sub"."fecha_real" <= (CURRENT_DATE + 7))) OR (("sub"."fecha_real" IS NULL) AND (("sub"."fecha_estimada" >= CURRENT_DATE) AND ("sub"."fecha_estimada" <= (CURRENT_DATE + 7)))))
UNION ALL
 SELECT 'etd'::"text" AS "tipo",
    'ETD PI'::"text" AS "subtipo",
    NULL::"date" AS "fecha_real",
        CASE
            WHEN (("p"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'YYYY-MM-DD'::"text")
            WHEN (("p"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'DD/MM/YYYY'::"text")
            ELSE NULL::"date"
        END AS "fecha_teorica",
    NULL::"uuid" AS "linea_pedido_id",
    "p"."id" AS "po_id",
        CASE
            WHEN (("p"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'YYYY-MM-DD'::"text")
            WHEN (("p"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'DD/MM/YYYY'::"text")
            ELSE NULL::"date"
        END AS "fecha_alerta",
    true AS "es_estimada"
   FROM "public"."pos" "p"
  WHERE ((
        CASE
            WHEN (("p"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'YYYY-MM-DD'::"text")
            WHEN (("p"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'DD/MM/YYYY'::"text")
            ELSE NULL::"date"
        END >= CURRENT_DATE) AND (
        CASE
            WHEN (("p"."etd_pi")::"text" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'YYYY-MM-DD'::"text")
            WHEN (("p"."etd_pi")::"text" ~ '^\d{2}/\d{2}/\d{4}$'::"text") THEN "to_date"(("p"."etd_pi")::"text", 'DD/MM/YYYY'::"text")
            ELSE NULL::"date"
        END <= (CURRENT_DATE + 7)));


ALTER VIEW "public"."v_alertas_candidatas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."validaciones_muestra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "muestra_id" "uuid",
    "tipo_validacion" "text" NOT NULL,
    "resultado" "text" NOT NULL,
    "fecha_validacion" "date",
    "responsable" "text",
    "comentarios" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."validaciones_muestra" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_commercial_seasons_v1" AS
 WITH "season_codes" AS (
         SELECT DISTINCT "btrim"("p"."season") AS "season"
           FROM "public"."pos" "p"
          WHERE (("p"."season" IS NOT NULL) AND ("btrim"("p"."season") <> ''::"text"))
        UNION
         SELECT DISTINCT "btrim"("pas"."season") AS "season"
           FROM "public"."production_active_seasons" "pas"
          WHERE (("pas"."season" IS NOT NULL) AND ("btrim"("pas"."season") <> ''::"text"))
        ), "parsed" AS (
         SELECT "season_codes"."season",
                CASE
                    WHEN ("season_codes"."season" ~ '^[0-9]+SS[0-9]{2}$'::"text") THEN 'SS'::"text"
                    WHEN ("season_codes"."season" ~ '^[0-9]+FW[0-9]{2}$'::"text") THEN 'FW'::"text"
                    ELSE NULL::"text"
                END AS "season_type",
                CASE
                    WHEN ("season_codes"."season" ~ '^[0-9]+(SS|FW)[0-9]{2}$'::"text") THEN ("right"("season_codes"."season", 2))::integer
                    ELSE NULL::integer
                END AS "commercial_year_short",
                CASE
                    WHEN ("season_codes"."season" ~ '^[0-9]+(SS|FW)[0-9]{2}$'::"text") THEN (2000 + ("right"("season_codes"."season", 2))::integer)
                    ELSE NULL::integer
                END AS "commercial_year",
                CASE
                    WHEN ("season_codes"."season" ~ '^[0-9]+(SS|FW)[0-9]{2}$'::"text") THEN ("left"("season_codes"."season", ("length"("season_codes"."season") - 4)))::integer
                    ELSE NULL::integer
                END AS "sequence_prefix"
           FROM "season_codes"
        ), "with_previous_sister" AS (
         SELECT "current_season"."season",
            "current_season"."season_type",
            "current_season"."commercial_year_short",
            "current_season"."commercial_year",
            "current_season"."sequence_prefix",
            "previous_season"."season" AS "previous_sister_season"
           FROM ("parsed" "current_season"
             LEFT JOIN "parsed" "previous_season" ON ((("previous_season"."season_type" = "current_season"."season_type") AND ("previous_season"."commercial_year" = ("current_season"."commercial_year" - 1)))))
        )
 SELECT "season",
    "season_type",
    "commercial_year_short",
    "commercial_year",
    "sequence_prefix",
    "previous_sister_season",
        CASE
            WHEN (("season_type" IS NOT NULL) AND ("commercial_year_short" IS NOT NULL)) THEN ("season_type" || "lpad"(("commercial_year_short")::"text", 2, '0'::"text"))
            ELSE "season"
        END AS "display_name",
    COALESCE(( SELECT "pas"."is_active"
           FROM "public"."production_active_seasons" "pas"
          WHERE ("btrim"("pas"."season") = "with_previous_sister"."season")
         LIMIT 1), false) AS "is_active"
   FROM "with_previous_sister";


ALTER VIEW "public"."vw_commercial_seasons_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_campaign_board_v1" AS
 WITH "sample_pivot" AS (
         SELECT "muestras"."linea_pedido_id",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'CFMS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "cfms_status",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'COUNTERS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "counters_status",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'FITTINGS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "fittings_status",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'PPS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "pps_status",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'TESTINGS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "testings_status",
            "max"(
                CASE
                    WHEN ("muestras"."tipo_muestra" = 'SHIPPINGS'::"text") THEN "muestras"."estado_muestra"
                    ELSE NULL::"text"
                END) AS "shippings_status"
           FROM "public"."muestras"
          GROUP BY "muestras"."linea_pedido_id"
        )
 SELECT "p"."customer",
    "p"."season",
    "p"."supplier",
    "lp"."etd" AS "etd_pi",
    "string_agg"(DISTINCT ("p"."id")::"text", ', '::"text" ORDER BY ("p"."id")::"text") AS "po_id_list",
    "string_agg"(DISTINCT "p"."po", ', '::"text" ORDER BY "p"."po") AS "po_list",
    "lp"."reference",
    "lp"."style",
    "lp"."color",
    "sum"("lp"."qty") AS "qty_total",
    "max"("sp"."cfms_status") AS "cfms_status",
    "max"("sp"."counters_status") AS "counters_status",
    "max"("sp"."fittings_status") AS "fittings_status",
    "max"("sp"."pps_status") AS "pps_status",
    "max"("sp"."testings_status") AS "testings_status",
    "max"("sp"."shippings_status") AS "shippings_status",
    "min"("lp"."trial_upper") AS "trial_upper",
    "min"("lp"."trial_lasting") AS "trial_lasting",
    "min"("lp"."lasting") AS "lasting",
    "min"("lp"."inspection") AS "inspection",
    ("min"("lp"."booking"))::"text" AS "booking",
    ("min"("lp"."closing"))::"text" AS "closing",
    "min"("lp"."shipping_date") AS "shipping_date"
   FROM (("public"."lineas_pedido" "lp"
     JOIN "public"."pos" "p" ON (("p"."id" = "lp"."po_id")))
     LEFT JOIN "sample_pivot" "sp" ON (("sp"."linea_pedido_id" = "lp"."id")))
  GROUP BY "p"."customer", "p"."season", "p"."supplier", "lp"."etd", "lp"."reference", "lp"."style", "lp"."color";


ALTER VIEW "public"."vw_customer_campaign_board_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_daily_alert_events_v1" AS
 WITH "base" AS (
         SELECT "b"."customer",
            "b"."season",
            "b"."supplier",
            "b"."etd_pi",
            "b"."po_id_list",
            "b"."po_list",
            "b"."reference",
            "b"."style",
            "b"."color",
            "b"."qty_total",
            "b"."cfms_status",
            "b"."counters_status",
            "b"."fittings_status",
            "b"."pps_status",
            "b"."testings_status",
            "b"."shippings_status",
                CASE
                    WHEN (("b"."trial_upper" ~ '^\d{4}-\d{2}-\d{2}$'::"text") AND ("b"."trial_upper" <> '1900-01-15'::"text")) THEN ("b"."trial_upper")::"date"
                    ELSE NULL::"date"
                END AS "trial_upper_date",
                CASE
                    WHEN (("b"."trial_lasting" ~ '^\d{4}-\d{2}-\d{2}$'::"text") AND ("b"."trial_lasting" <> '1900-01-15'::"text")) THEN ("b"."trial_lasting")::"date"
                    ELSE NULL::"date"
                END AS "trial_lasting_date",
                CASE
                    WHEN (("b"."lasting" ~ '^\d{4}-\d{2}-\d{2}$'::"text") AND ("b"."lasting" <> '1900-01-15'::"text")) THEN ("b"."lasting")::"date"
                    ELSE NULL::"date"
                END AS "lasting_date",
            "b"."inspection",
                CASE
                    WHEN ("b"."booking" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("b"."booking")::"date"
                    ELSE NULL::"date"
                END AS "booking_date",
                CASE
                    WHEN ("b"."closing" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("b"."closing")::"date"
                    ELSE NULL::"date"
                END AS "closing_date",
            "b"."shipping_date"
           FROM ("public"."vw_customer_campaign_board_v1" "b"
             JOIN "public"."production_active_seasons" "s" ON ((("s"."season" = "b"."season") AND ("s"."is_active" = true))))
        ), "events" AS (
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'SAMPLE_REJECTED'::"text" AS "alert_type",
            'CRITICAL'::"text" AS "alert_level",
            1 AS "alert_priority",
            NULL::"date" AS "alert_date",
            'STATUS'::"text" AS "alert_date_source",
            'Hay muestras rechazadas.'::"text" AS "alert_reason"
           FROM "base"
          WHERE (("base"."cfms_status" = 'Rechazado'::"text") OR ("base"."counters_status" = 'Rechazado'::"text") OR ("base"."fittings_status" = 'Rechazado'::"text") OR ("base"."pps_status" = 'Rechazado'::"text") OR ("base"."testings_status" = 'Rechazado'::"text") OR ("base"."shippings_status" = 'Rechazado'::"text"))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'SAMPLE_PENDING'::"text",
            'MONITOR'::"text",
            3,
            NULL::"date" AS "date",
            'STATUS'::"text",
            'Hay muestras pendientes.'::"text"
           FROM "base"
          WHERE (("base"."cfms_status" = 'Pendiente'::"text") OR ("base"."counters_status" = 'Pendiente'::"text") OR ("base"."fittings_status" = 'Pendiente'::"text") OR ("base"."pps_status" = 'Pendiente'::"text") OR ("base"."testings_status" = 'Pendiente'::"text") OR ("base"."shippings_status" = 'Pendiente'::"text"))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'SHIPPING_OVERDUE'::"text",
            'CRITICAL'::"text",
            1,
            "base"."etd_pi",
            'ESTIMATED'::"text",
            'ETD vencido y sin shipping registrado.'::"text"
           FROM "base"
          WHERE (("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" < CURRENT_DATE) AND ("base"."shipping_date" IS NULL))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'SHIPPING_UPCOMING'::"text",
            'MONITOR'::"text",
            3,
            "base"."shipping_date",
            'REAL'::"text",
            'Shipping previsto en los prÃ³ximos 15 dÃ­as.'::"text"
           FROM "base"
          WHERE (("base"."shipping_date" IS NOT NULL) AND (("base"."shipping_date" >= CURRENT_DATE) AND ("base"."shipping_date" <= (CURRENT_DATE + '15 days'::interval))))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'ETD_UPCOMING'::"text",
            'MONITOR'::"text",
            3,
            "base"."etd_pi",
            'ESTIMATED'::"text",
            'ETD PI prÃ³ximo en los prÃ³ximos 15 dÃ­as.'::"text"
           FROM "base"
          WHERE (("base"."shipping_date" IS NULL) AND ("base"."etd_pi" IS NOT NULL) AND (("base"."etd_pi" >= CURRENT_DATE) AND ("base"."etd_pi" <= (CURRENT_DATE + '15 days'::interval))))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'TRIAL_UPPER_UPCOMING'::"text",
            'WARNING'::"text",
            2,
            (COALESCE(("base"."trial_upper_date")::timestamp without time zone, ("base"."etd_pi" - '10 days'::interval)))::"date" AS "coalesce",
                CASE
                    WHEN ("base"."trial_upper_date" IS NOT NULL) THEN 'REAL'::"text"
                    ELSE 'ESTIMATED'::"text"
                END AS "case",
            'Trial Upper previsto en los prÃ³ximos 7 dÃ­as.'::"text"
           FROM "base"
          WHERE (((COALESCE(("base"."trial_upper_date")::timestamp without time zone, ("base"."etd_pi" - '10 days'::interval)))::"date" >= CURRENT_DATE) AND ((COALESCE(("base"."trial_upper_date")::timestamp without time zone, ("base"."etd_pi" - '10 days'::interval)))::"date" <= (CURRENT_DATE + '7 days'::interval)))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'TRIAL_LASTING_UPCOMING'::"text",
            'WARNING'::"text",
            2,
            (COALESCE(("base"."trial_lasting_date")::timestamp without time zone, ("base"."etd_pi" - '9 days'::interval)))::"date" AS "coalesce",
                CASE
                    WHEN ("base"."trial_lasting_date" IS NOT NULL) THEN 'REAL'::"text"
                    ELSE 'ESTIMATED'::"text"
                END AS "case",
            'Trial Lasting previsto en los prÃ³ximos 7 dÃ­as.'::"text"
           FROM "base"
          WHERE (((COALESCE(("base"."trial_lasting_date")::timestamp without time zone, ("base"."etd_pi" - '9 days'::interval)))::"date" >= CURRENT_DATE) AND ((COALESCE(("base"."trial_lasting_date")::timestamp without time zone, ("base"."etd_pi" - '9 days'::interval)))::"date" <= (CURRENT_DATE + '7 days'::interval)))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'LASTING_UPCOMING'::"text",
            'WARNING'::"text",
            2,
            (COALESCE(("base"."lasting_date")::timestamp without time zone, ("base"."etd_pi" - '11 days'::interval)))::"date" AS "coalesce",
                CASE
                    WHEN ("base"."lasting_date" IS NOT NULL) THEN 'REAL'::"text"
                    ELSE 'ESTIMATED'::"text"
                END AS "case",
            'Lasting previsto en los prÃ³ximos 7 dÃ­as.'::"text"
           FROM "base"
          WHERE (((COALESCE(("base"."lasting_date")::timestamp without time zone, ("base"."etd_pi" - '11 days'::interval)))::"date" >= CURRENT_DATE) AND ((COALESCE(("base"."lasting_date")::timestamp without time zone, ("base"."etd_pi" - '11 days'::interval)))::"date" <= (CURRENT_DATE + '7 days'::interval)))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'BOOKING_UPCOMING'::"text",
            'MONITOR'::"text",
            3,
            "base"."booking_date",
            'REAL'::"text",
            'Booking previsto en los prÃ³ximos 7 dÃ­as.'::"text"
           FROM "base"
          WHERE (("base"."booking_date" IS NOT NULL) AND (("base"."booking_date" >= CURRENT_DATE) AND ("base"."booking_date" <= (CURRENT_DATE + '7 days'::interval))))
        UNION ALL
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper_date",
            "base"."trial_lasting_date",
            "base"."lasting_date",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            'CLOSING_UPCOMING'::"text",
            'MONITOR'::"text",
            3,
            "base"."closing_date",
            'REAL'::"text",
            'Closing previsto en los prÃ³ximos 7 dÃ­as.'::"text"
           FROM "base"
          WHERE (("base"."closing_date" IS NOT NULL) AND (("base"."closing_date" >= CURRENT_DATE) AND ("base"."closing_date" <= (CURRENT_DATE + '7 days'::interval))))
        )
 SELECT "md5"("concat_ws"('|'::"text", "customer", "season", "supplier", ("etd_pi")::"text", "reference", "style", "color", "alert_type", ("alert_date")::"text")) AS "alert_event_id",
    "customer",
    "season",
    "supplier",
    "etd_pi",
    "po_id_list",
    "po_list",
    "reference",
    "style",
    "color",
    "qty_total",
    "alert_type",
    "alert_level",
    "alert_priority",
    "alert_date",
    "alert_date_source",
    "alert_reason",
    "trial_upper_date",
    "trial_lasting_date",
    "lasting_date",
    "inspection",
    "booking_date",
    "closing_date",
    "shipping_date",
    ("alert_date" - CURRENT_DATE) AS "days_to_alert"
   FROM "events";


ALTER VIEW "public"."vw_customer_daily_alert_events_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_qc_trial_bridge_v2" AS
 WITH "qc_stage" AS (
         SELECT "q"."id",
            "q"."po_id",
            "q"."po_number",
            "q"."reference",
            "q"."style",
            "q"."color",
            "q"."inspector",
            "q"."qty_po",
            "q"."qty_inspected",
            "q"."aql_level",
            "q"."aql_result",
            "q"."critical_allowed",
            "q"."major_allowed",
            "q"."minor_allowed",
            "q"."critical_found",
            "q"."major_found",
            "q"."minor_found",
            "q"."inspection_date",
            "q"."created_at",
            "q"."report_number",
            "q"."inspection_type",
            "q"."factory",
            "q"."customer",
            "q"."season",
                CASE
                    WHEN (("q"."inspection_type" ~~* 'T4-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Stitching%'::"text") OR ("q"."inspection_type" ~~* '%Stitching%'::"text")) THEN 'TRIAL_UPPER'::"text"
                    WHEN (("q"."inspection_type" ~~* 'T5-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Lasting%'::"text") OR ("q"."inspection_type" ~~* '%Lasting%'::"text")) THEN 'TRIAL_LASTING'::"text"
                    WHEN (("q"."inspection_type" ~~* 'T6-%'::"text") OR ("q"."inspection_type" ~~* '%Assembling%'::"text")) THEN 'ASSEMBLING'::"text"
                    WHEN (("q"."inspection_type" ~~* 'T7-%'::"text") OR ("q"."inspection_type" ~~* '%FPI%'::"text") OR ("q"."inspection_type" ~~* '%Final%'::"text")) THEN 'FINAL_INSPECTION'::"text"
                    ELSE 'QC_REPORT'::"text"
                END AS "qc_process_stage",
                CASE
                    WHEN ("q"."aql_result" ~~* '%fail%'::"text") THEN 'QC_FAILED'::"text"
                    WHEN ((COALESCE("q"."critical_found", 0) > 0) OR (COALESCE("q"."major_found", 0) > 0) OR (COALESCE("q"."minor_found", 0) > 0)) THEN 'QC_ISSUES'::"text"
                    ELSE 'QC_OK'::"text"
                END AS "qc_status"
           FROM "public"."qc_inspections" "q"
        ), "matched" AS (
         SELECT "b"."customer",
            "b"."season",
            "b"."supplier",
            "b"."etd_pi",
            "b"."po_id_list",
            "b"."po_list",
            "b"."reference",
            "b"."style",
            "b"."color",
            "b"."qty_total",
            "b"."trial_upper",
            "b"."trial_lasting",
            "b"."lasting",
            "q"."id",
            "q"."report_number",
            "q"."inspection_type",
            "q"."inspection_date",
            "q"."inspector",
            "q"."factory",
            "q"."aql_result",
            "q"."critical_found",
            "q"."major_found",
            "q"."minor_found",
            "q"."qc_process_stage",
            "q"."qc_status"
           FROM ("public"."vw_customer_campaign_board_v1" "b"
             LEFT JOIN "qc_stage" "q" ON ((("q"."customer" = "b"."customer") AND ("q"."season" = "b"."season") AND ("q"."reference" = "b"."reference") AND ("q"."style" = "b"."style") AND ("lower"(TRIM(BOTH FROM "q"."color")) = "lower"(TRIM(BOTH FROM "b"."color"))))))
          WHERE ("b"."season" IN ( SELECT "production_active_seasons"."season"
                   FROM "public"."production_active_seasons"
                  WHERE ("production_active_seasons"."is_active" = true)))
        )
 SELECT "customer",
    "season",
    "supplier",
    "etd_pi",
    "po_id_list",
    "po_list",
    "reference",
    "style",
    "color",
    "qty_total",
    "trial_upper",
    "trial_lasting",
    "lasting",
    "max"(("id")::"text") FILTER (WHERE ("qc_process_stage" = 'TRIAL_UPPER'::"text")) AS "trial_upper_qc_id",
    "max"("report_number") FILTER (WHERE ("qc_process_stage" = 'TRIAL_UPPER'::"text")) AS "trial_upper_report_number",
    "max"("inspection_date") FILTER (WHERE ("qc_process_stage" = 'TRIAL_UPPER'::"text")) AS "trial_upper_qc_date",
    "max"("qc_status") FILTER (WHERE ("qc_process_stage" = 'TRIAL_UPPER'::"text")) AS "trial_upper_qc_status",
    "max"(("id")::"text") FILTER (WHERE ("qc_process_stage" = 'TRIAL_LASTING'::"text")) AS "trial_lasting_qc_id",
    "max"("report_number") FILTER (WHERE ("qc_process_stage" = 'TRIAL_LASTING'::"text")) AS "trial_lasting_report_number",
    "max"("inspection_date") FILTER (WHERE ("qc_process_stage" = 'TRIAL_LASTING'::"text")) AS "trial_lasting_qc_date",
    "max"("qc_status") FILTER (WHERE ("qc_process_stage" = 'TRIAL_LASTING'::"text")) AS "trial_lasting_qc_status",
    "max"(("id")::"text") FILTER (WHERE ("qc_process_stage" = 'ASSEMBLING'::"text")) AS "assembling_qc_id",
    "max"("report_number") FILTER (WHERE ("qc_process_stage" = 'ASSEMBLING'::"text")) AS "assembling_report_number",
    "max"("inspection_date") FILTER (WHERE ("qc_process_stage" = 'ASSEMBLING'::"text")) AS "assembling_qc_date",
    "max"("qc_status") FILTER (WHERE ("qc_process_stage" = 'ASSEMBLING'::"text")) AS "assembling_qc_status",
    "count"("id") AS "qc_report_count",
        CASE
            WHEN ("count"("id") = 0) THEN 'QC_PENDING'::"text"
            WHEN "bool_or"(("qc_status" = 'QC_FAILED'::"text")) THEN 'QC_FAILED'::"text"
            WHEN "bool_or"(("qc_status" = 'QC_ISSUES'::"text")) THEN 'QC_ISSUES'::"text"
            ELSE 'QC_OK'::"text"
        END AS "qc_status"
   FROM "matched"
  GROUP BY "customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "trial_upper", "trial_lasting", "lasting";


ALTER VIEW "public"."vw_customer_qc_trial_bridge_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_daily_alert_events_v2" AS
 WITH "base" AS (
         SELECT "b"."customer",
            "b"."season",
            "b"."supplier",
            "b"."etd_pi",
            "b"."po_id_list",
            "b"."po_list",
            "b"."reference",
            "b"."style",
            "b"."color",
            "b"."qty_total",
            "b"."cfms_status",
            "b"."counters_status",
            "b"."fittings_status",
            "b"."pps_status",
            "b"."testings_status",
            "b"."shippings_status",
            "b"."trial_upper",
            "b"."trial_lasting",
            "b"."lasting",
            "b"."inspection",
            "b"."booking",
            "b"."closing",
            "b"."shipping_date"
           FROM ("public"."vw_customer_campaign_board_v1" "b"
             JOIN "public"."production_active_seasons" "s" ON ((("s"."season" = "b"."season") AND (COALESCE("s"."is_active", true) = true))))
          WHERE (("b"."shipping_date" IS NULL) OR ("b"."shipping_date" >= CURRENT_DATE))
        ), "normalized" AS (
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."cfms_status", ''::"text")), ''::"text") AS "cfms_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."counters_status", ''::"text")), ''::"text") AS "counters_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."fittings_status", ''::"text")), ''::"text") AS "fittings_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."pps_status", ''::"text")), ''::"text") AS "pps_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."testings_status", ''::"text")), ''::"text") AS "testings_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."shippings_status", ''::"text")), ''::"text") AS "shippings_status",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."trial_upper", ''::"text")), ''::"text") AS "trial_upper",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."trial_lasting", ''::"text")), ''::"text") AS "trial_lasting",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."lasting", ''::"text")), ''::"text") AS "lasting",
            "base"."inspection",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."booking", ''::"text")), ''::"text") AS "booking",
            NULLIF(TRIM(BOTH FROM COALESCE("base"."closing", ''::"text")), ''::"text") AS "closing",
            "base"."shipping_date"
           FROM "base"
        ), "sample_flow" AS (
         SELECT "n"."customer",
            "n"."season",
            "n"."supplier",
            "n"."etd_pi",
            "n"."po_id_list",
            "n"."po_list",
            "n"."reference",
            "n"."style",
            "n"."color",
            "n"."qty_total",
            "n"."cfms_status",
            "n"."counters_status",
            "n"."fittings_status",
            "n"."pps_status",
            "n"."testings_status",
            "n"."shippings_status",
            "n"."trial_upper",
            "n"."trial_lasting",
            "n"."lasting",
            "n"."inspection",
            "n"."booking",
            "n"."closing",
            "n"."shipping_date",
            "s"."sample_order",
            "s"."sample_name",
            "s"."sample_status"
           FROM ("normalized" "n"
             CROSS JOIN LATERAL ( VALUES (1,'CFMS'::"text","n"."cfms_status"), (2,'COUNTERS'::"text","n"."counters_status"), (3,'FITTINGS'::"text","n"."fittings_status"), (4,'PPS'::"text","n"."pps_status"), (5,'TESTINGS'::"text","n"."testings_status"), (6,'SHIPPINGS'::"text","n"."shippings_status")) "s"("sample_order", "sample_name", "sample_status"))
        ), "sample_events" AS (
         SELECT "sf"."customer",
            "sf"."season",
            "sf"."supplier",
            "sf"."etd_pi",
            "sf"."po_id_list",
            "sf"."po_list",
            "sf"."reference",
            "sf"."style",
            "sf"."color",
            "sf"."qty_total",
            'SAMPLE_REJECTED'::"text" AS "alert_event",
            'CRITICAL'::"text" AS "alert_level",
            1 AS "priority",
            2 AS "sort_order",
            ("sf"."sample_name" || ' rejected'::"text") AS "alert_title",
            ("sf"."sample_name" || ' sample rejected and still blocking flow'::"text") AS "alert_message"
           FROM "sample_flow" "sf"
          WHERE (("upper"(COALESCE("sf"."sample_status", ''::"text")) = ANY (ARRAY['REJECTED'::"text", 'RECHAZADO'::"text", 'FAIL'::"text", 'FAILED'::"text"])) AND (NOT (EXISTS ( SELECT 1
                   FROM "sample_flow" "later"
                  WHERE (("later"."customer" = "sf"."customer") AND ("later"."season" = "sf"."season") AND ("later"."supplier" = "sf"."supplier") AND (COALESCE(("later"."etd_pi")::"text", ''::"text") = COALESCE(("sf"."etd_pi")::"text", ''::"text")) AND (COALESCE("later"."reference", ''::"text") = COALESCE("sf"."reference", ''::"text")) AND (COALESCE("later"."style", ''::"text") = COALESCE("sf"."style", ''::"text")) AND (COALESCE("later"."color", ''::"text") = COALESCE("sf"."color", ''::"text")) AND ("later"."sample_order" > "sf"."sample_order") AND ("upper"(COALESCE("later"."sample_status", ''::"text")) = ANY (ARRAY['APROBADO'::"text", 'APPROVED'::"text", 'CONFIRMADO'::"text", 'CONFIRMED'::"text", 'ENVIADO'::"text", 'SENT'::"text", 'OK'::"text", 'DONE'::"text", 'COMPLETED'::"text"])))))))
        UNION ALL
         SELECT "sf"."customer",
            "sf"."season",
            "sf"."supplier",
            "sf"."etd_pi",
            "sf"."po_id_list",
            "sf"."po_list",
            "sf"."reference",
            "sf"."style",
            "sf"."color",
            "sf"."qty_total",
            'SAMPLE_PENDING'::"text" AS "text",
            'WARNING'::"text" AS "text",
            2,
            9,
            ("sf"."sample_name" || ' pending'::"text"),
            ("sf"."sample_name" || ' sample pending'::"text")
           FROM "sample_flow" "sf"
          WHERE (("upper"(COALESCE("sf"."sample_status", ''::"text")) = ANY (ARRAY['PENDING'::"text", 'PENDIENTE'::"text"])) AND (NOT (EXISTS ( SELECT 1
                   FROM "sample_flow" "later"
                  WHERE (("later"."customer" = "sf"."customer") AND ("later"."season" = "sf"."season") AND ("later"."supplier" = "sf"."supplier") AND (COALESCE(("later"."etd_pi")::"text", ''::"text") = COALESCE(("sf"."etd_pi")::"text", ''::"text")) AND (COALESCE("later"."reference", ''::"text") = COALESCE("sf"."reference", ''::"text")) AND (COALESCE("later"."style", ''::"text") = COALESCE("sf"."style", ''::"text")) AND (COALESCE("later"."color", ''::"text") = COALESCE("sf"."color", ''::"text")) AND ("later"."sample_order" > "sf"."sample_order") AND ("upper"(COALESCE("later"."sample_status", ''::"text")) = ANY (ARRAY['APROBADO'::"text", 'APPROVED'::"text", 'CONFIRMADO'::"text", 'CONFIRMED'::"text", 'ENVIADO'::"text", 'SENT'::"text", 'OK'::"text", 'DONE'::"text", 'COMPLETED'::"text"])))))))
        ), "trial_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'TRIAL_PENDING'::"text" AS "text",
            'MONITOR'::"text" AS "text",
            3 AS "?column?",
            10 AS "?column?",
            'Trial pending'::"text" AS "?column?",
            'Trial Upper or Trial Lasting pending before ETD'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."etd_pi" IS NOT NULL) AND (("normalized"."etd_pi" >= CURRENT_DATE) AND ("normalized"."etd_pi" <= (CURRENT_DATE + '21 days'::interval))) AND (("normalized"."trial_upper" IS NULL) OR ("normalized"."trial_lasting" IS NULL)))
        ), "inspection_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'INSPECTION_DUE'::"text" AS "text",
            'WARNING'::"text" AS "text",
            2 AS "?column?",
            5 AS "?column?",
            'Inspection due'::"text" AS "?column?",
            'Inspection pending'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."inspection" IS NULL) AND ("normalized"."etd_pi" IS NOT NULL) AND ("normalized"."etd_pi" <= (CURRENT_DATE + '14 days'::interval)))
        ), "booking_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'BOOKING_DUE'::"text" AS "text",
            'WARNING'::"text" AS "text",
            2 AS "?column?",
            6 AS "?column?",
            'Booking due'::"text" AS "?column?",
            'Booking pending'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."booking" IS NULL) AND ("normalized"."etd_pi" IS NOT NULL) AND ("normalized"."etd_pi" <= (CURRENT_DATE + '14 days'::interval)))
        ), "closing_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'CLOSING_DUE'::"text" AS "text",
            'WARNING'::"text" AS "text",
            2 AS "?column?",
            7 AS "?column?",
            'Closing due'::"text" AS "?column?",
            'Closing pending'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."closing" IS NULL) AND ("normalized"."etd_pi" IS NOT NULL) AND ("normalized"."etd_pi" <= (CURRENT_DATE + '7 days'::interval)))
        ), "shipping_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'SHIPPING_OVERDUE'::"text" AS "text",
            'CRITICAL'::"text" AS "text",
            1 AS "?column?",
            3 AS "?column?",
            'Shipping overdue'::"text" AS "?column?",
            'Shipping overdue'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."shipping_date" IS NULL) AND ("normalized"."etd_pi" IS NOT NULL) AND ("normalized"."etd_pi" < CURRENT_DATE))
        ), "etd_events" AS (
         SELECT "normalized"."customer",
            "normalized"."season",
            "normalized"."supplier",
            "normalized"."etd_pi",
            "normalized"."po_id_list",
            "normalized"."po_list",
            "normalized"."reference",
            "normalized"."style",
            "normalized"."color",
            "normalized"."qty_total",
            'ETD_SOON'::"text" AS "text",
            'MONITOR'::"text" AS "text",
            3 AS "?column?",
            12 AS "?column?",
            'ETD soon'::"text" AS "?column?",
            'ETD approaching'::"text" AS "?column?"
           FROM "normalized"
          WHERE (("normalized"."shipping_date" IS NULL) AND ("normalized"."etd_pi" IS NOT NULL) AND (("normalized"."etd_pi" >= CURRENT_DATE) AND ("normalized"."etd_pi" <= (CURRENT_DATE + '14 days'::interval))))
        ), "qc_events" AS (
         SELECT "b"."customer",
            "b"."season",
            "b"."supplier",
            "b"."etd_pi",
            "b"."po_id_list",
            "b"."po_list",
            "b"."reference",
            "b"."style",
            "b"."color",
            "b"."qty_total",
                CASE
                    WHEN ("qc"."qc_status" = 'QC_FAILED'::"text") THEN 'QC_FAILED'::"text"
                    WHEN ("qc"."qc_status" = 'QC_ISSUES'::"text") THEN 'QC_ISSUES'::"text"
                    WHEN ("qc"."qc_status" = 'QC_PENDING'::"text") THEN 'QC_PENDING'::"text"
                    ELSE NULL::"text"
                END AS "alert_event",
                CASE
                    WHEN ("qc"."qc_status" = 'QC_FAILED'::"text") THEN 'CRITICAL'::"text"
                    WHEN ("qc"."qc_status" = 'QC_ISSUES'::"text") THEN 'WARNING'::"text"
                    WHEN ("qc"."qc_status" = 'QC_PENDING'::"text") THEN 'MONITOR'::"text"
                    ELSE NULL::"text"
                END AS "alert_level",
                CASE
                    WHEN ("qc"."qc_status" = 'QC_FAILED'::"text") THEN 1
                    WHEN ("qc"."qc_status" = 'QC_ISSUES'::"text") THEN 2
                    WHEN ("qc"."qc_status" = 'QC_PENDING'::"text") THEN 3
                    ELSE NULL::integer
                END AS "priority",
                CASE
                    WHEN ("qc"."qc_status" = 'QC_FAILED'::"text") THEN 1
                    WHEN ("qc"."qc_status" = 'QC_ISSUES'::"text") THEN 8
                    WHEN ("qc"."qc_status" = 'QC_PENDING'::"text") THEN 11
                    ELSE NULL::integer
                END AS "sort_order",
            "qc"."qc_status" AS "alert_title",
            "qc"."qc_status" AS "alert_message"
           FROM ("normalized" "b"
             JOIN "public"."vw_customer_qc_trial_bridge_v2" "qc" ON ((("qc"."customer" = "b"."customer") AND ("qc"."season" = "b"."season") AND ("qc"."reference" = "b"."reference") AND ("qc"."style" = "b"."style") AND ("qc"."color" = "b"."color"))))
          WHERE ("qc"."qc_status" = ANY (ARRAY['QC_FAILED'::"text", 'QC_ISSUES'::"text", 'QC_PENDING'::"text"]))
        ), "events" AS (
         SELECT "sample_events"."customer",
            "sample_events"."season",
            "sample_events"."supplier",
            "sample_events"."etd_pi",
            "sample_events"."po_id_list",
            "sample_events"."po_list",
            "sample_events"."reference",
            "sample_events"."style",
            "sample_events"."color",
            "sample_events"."qty_total",
            "sample_events"."alert_event",
            "sample_events"."alert_level",
            "sample_events"."priority",
            "sample_events"."sort_order",
            "sample_events"."alert_title",
            "sample_events"."alert_message"
           FROM "sample_events"
        UNION ALL
         SELECT "trial_events"."customer",
            "trial_events"."season",
            "trial_events"."supplier",
            "trial_events"."etd_pi",
            "trial_events"."po_id_list",
            "trial_events"."po_list",
            "trial_events"."reference",
            "trial_events"."style",
            "trial_events"."color",
            "trial_events"."qty_total",
            "trial_events"."text",
            "trial_events"."text_1" AS "text",
            "trial_events"."?column?",
            "trial_events"."?column?_1" AS "?column?",
            "trial_events"."?column?_2" AS "?column?",
            "trial_events"."?column?_3" AS "?column?"
           FROM "trial_events" "trial_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "inspection_events"."customer",
            "inspection_events"."season",
            "inspection_events"."supplier",
            "inspection_events"."etd_pi",
            "inspection_events"."po_id_list",
            "inspection_events"."po_list",
            "inspection_events"."reference",
            "inspection_events"."style",
            "inspection_events"."color",
            "inspection_events"."qty_total",
            "inspection_events"."text",
            "inspection_events"."text_1" AS "text",
            "inspection_events"."?column?",
            "inspection_events"."?column?_1" AS "?column?",
            "inspection_events"."?column?_2" AS "?column?",
            "inspection_events"."?column?_3" AS "?column?"
           FROM "inspection_events" "inspection_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "booking_events"."customer",
            "booking_events"."season",
            "booking_events"."supplier",
            "booking_events"."etd_pi",
            "booking_events"."po_id_list",
            "booking_events"."po_list",
            "booking_events"."reference",
            "booking_events"."style",
            "booking_events"."color",
            "booking_events"."qty_total",
            "booking_events"."text",
            "booking_events"."text_1" AS "text",
            "booking_events"."?column?",
            "booking_events"."?column?_1" AS "?column?",
            "booking_events"."?column?_2" AS "?column?",
            "booking_events"."?column?_3" AS "?column?"
           FROM "booking_events" "booking_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "closing_events"."customer",
            "closing_events"."season",
            "closing_events"."supplier",
            "closing_events"."etd_pi",
            "closing_events"."po_id_list",
            "closing_events"."po_list",
            "closing_events"."reference",
            "closing_events"."style",
            "closing_events"."color",
            "closing_events"."qty_total",
            "closing_events"."text",
            "closing_events"."text_1" AS "text",
            "closing_events"."?column?",
            "closing_events"."?column?_1" AS "?column?",
            "closing_events"."?column?_2" AS "?column?",
            "closing_events"."?column?_3" AS "?column?"
           FROM "closing_events" "closing_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "shipping_events"."customer",
            "shipping_events"."season",
            "shipping_events"."supplier",
            "shipping_events"."etd_pi",
            "shipping_events"."po_id_list",
            "shipping_events"."po_list",
            "shipping_events"."reference",
            "shipping_events"."style",
            "shipping_events"."color",
            "shipping_events"."qty_total",
            "shipping_events"."text",
            "shipping_events"."text_1" AS "text",
            "shipping_events"."?column?",
            "shipping_events"."?column?_1" AS "?column?",
            "shipping_events"."?column?_2" AS "?column?",
            "shipping_events"."?column?_3" AS "?column?"
           FROM "shipping_events" "shipping_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "etd_events"."customer",
            "etd_events"."season",
            "etd_events"."supplier",
            "etd_events"."etd_pi",
            "etd_events"."po_id_list",
            "etd_events"."po_list",
            "etd_events"."reference",
            "etd_events"."style",
            "etd_events"."color",
            "etd_events"."qty_total",
            "etd_events"."text",
            "etd_events"."text_1" AS "text",
            "etd_events"."?column?",
            "etd_events"."?column?_1" AS "?column?",
            "etd_events"."?column?_2" AS "?column?",
            "etd_events"."?column?_3" AS "?column?"
           FROM "etd_events" "etd_events"("customer", "season", "supplier", "etd_pi", "po_id_list", "po_list", "reference", "style", "color", "qty_total", "text", "text_1", "?column?", "?column?_1", "?column?_2", "?column?_3")
        UNION ALL
         SELECT "qc_events"."customer",
            "qc_events"."season",
            "qc_events"."supplier",
            "qc_events"."etd_pi",
            "qc_events"."po_id_list",
            "qc_events"."po_list",
            "qc_events"."reference",
            "qc_events"."style",
            "qc_events"."color",
            "qc_events"."qty_total",
            "qc_events"."alert_event",
            "qc_events"."alert_level",
            "qc_events"."priority",
            "qc_events"."sort_order",
            "qc_events"."alert_title",
            "qc_events"."alert_message"
           FROM "qc_events"
        )
 SELECT "md5"("concat_ws"('|'::"text", "customer", "season", "supplier", ("etd_pi")::"text", "reference", "style", "color")) AS "operational_group_key",
    "md5"("concat_ws"('|'::"text", "customer", "season", "supplier", ("etd_pi")::"text", "reference", "style", "color", "alert_event", "alert_title")) AS "alert_event_key",
    "customer",
    "season",
    "supplier",
    "etd_pi",
    "po_id_list",
    "po_list",
    "reference",
    "style",
    "color",
    "qty_total",
    "alert_event",
    "alert_level",
    "priority",
    "sort_order",
    "alert_title",
    "alert_message",
    CURRENT_DATE AS "alert_date",
    "now"() AS "generated_at"
   FROM "events"
  WHERE ("alert_event" IS NOT NULL);


ALTER VIEW "public"."vw_customer_daily_alert_events_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_daily_alert_summary_v1" AS
 WITH "grouped" AS (
         SELECT "vw_customer_daily_alert_events_v1"."customer",
            "vw_customer_daily_alert_events_v1"."season",
            "vw_customer_daily_alert_events_v1"."supplier",
            "vw_customer_daily_alert_events_v1"."etd_pi",
            "vw_customer_daily_alert_events_v1"."po_id_list",
            "vw_customer_daily_alert_events_v1"."po_list",
            "vw_customer_daily_alert_events_v1"."reference",
            "vw_customer_daily_alert_events_v1"."style",
            "vw_customer_daily_alert_events_v1"."color",
            "vw_customer_daily_alert_events_v1"."qty_total",
            "min"("vw_customer_daily_alert_events_v1"."alert_priority") AS "highest_alert_priority",
            "count"(*) AS "alerts_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v1"."alert_level" = 'CRITICAL'::"text")) AS "critical_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v1"."alert_level" = 'WARNING'::"text")) AS "warning_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v1"."alert_level" = 'MONITOR'::"text")) AS "monitor_count",
            "min"("vw_customer_daily_alert_events_v1"."alert_date") FILTER (WHERE ("vw_customer_daily_alert_events_v1"."alert_date" IS NOT NULL)) AS "next_alert_date",
            "string_agg"(DISTINCT "vw_customer_daily_alert_events_v1"."alert_type", ', '::"text" ORDER BY "vw_customer_daily_alert_events_v1"."alert_type") AS "alert_types",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'SAMPLE_REJECTED'::"text")) AS "has_sample_rejected",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'SHIPPING_OVERDUE'::"text")) AS "has_shipping_overdue",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'TRIAL_UPPER_UPCOMING'::"text")) AS "has_trial_upper",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'TRIAL_LASTING_UPCOMING'::"text")) AS "has_trial_lasting",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'LASTING_UPCOMING'::"text")) AS "has_lasting",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'CLOSING_UPCOMING'::"text")) AS "has_closing",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'SAMPLE_PENDING'::"text")) AS "has_sample_pending",
            "bool_or"(("vw_customer_daily_alert_events_v1"."alert_type" = 'SHIPPING_UPCOMING'::"text")) AS "has_shipping_upcoming"
           FROM "public"."vw_customer_daily_alert_events_v1"
          GROUP BY "vw_customer_daily_alert_events_v1"."customer", "vw_customer_daily_alert_events_v1"."season", "vw_customer_daily_alert_events_v1"."supplier", "vw_customer_daily_alert_events_v1"."etd_pi", "vw_customer_daily_alert_events_v1"."po_id_list", "vw_customer_daily_alert_events_v1"."po_list", "vw_customer_daily_alert_events_v1"."reference", "vw_customer_daily_alert_events_v1"."style", "vw_customer_daily_alert_events_v1"."color", "vw_customer_daily_alert_events_v1"."qty_total"
        )
 SELECT "customer",
    "season",
    "supplier",
    "etd_pi",
    "po_id_list",
    "po_list",
    "reference",
    "style",
    "color",
    "qty_total",
    "highest_alert_priority",
    "alerts_count",
    "critical_count",
    "warning_count",
    "monitor_count",
    "next_alert_date",
    "alert_types",
    "has_sample_rejected",
    "has_shipping_overdue",
    "has_trial_upper",
    "has_trial_lasting",
    "has_lasting",
    "has_closing",
    "has_sample_pending",
    "has_shipping_upcoming",
        CASE "highest_alert_priority"
            WHEN 1 THEN 'CRITICAL'::"text"
            WHEN 2 THEN 'WARNING'::"text"
            WHEN 3 THEN 'MONITOR'::"text"
            ELSE 'OK'::"text"
        END AS "highest_alert_level",
        CASE
            WHEN "has_sample_rejected" THEN 'SAMPLE_REJECTED'::"text"
            WHEN "has_shipping_overdue" THEN 'SHIPPING_OVERDUE'::"text"
            WHEN "has_lasting" THEN 'LASTING_UPCOMING'::"text"
            WHEN "has_trial_lasting" THEN 'TRIAL_LASTING_UPCOMING'::"text"
            WHEN "has_trial_upper" THEN 'TRIAL_UPPER_UPCOMING'::"text"
            WHEN "has_closing" THEN 'CLOSING_UPCOMING'::"text"
            WHEN "has_sample_pending" THEN 'SAMPLE_PENDING'::"text"
            WHEN "has_shipping_upcoming" THEN 'SHIPPING_UPCOMING'::"text"
            ELSE 'OK'::"text"
        END AS "primary_action_type",
        CASE
            WHEN "has_sample_rejected" THEN 'Muestra rechazada'::"text"
            WHEN "has_shipping_overdue" THEN 'Shipping vencido'::"text"
            WHEN "has_lasting" THEN 'Revisar Lasting'::"text"
            WHEN "has_trial_lasting" THEN 'Revisar Trial Lasting'::"text"
            WHEN "has_trial_upper" THEN 'Revisar Trial Upper'::"text"
            WHEN "has_closing" THEN 'Closing prÃ³ximo'::"text"
            WHEN "has_sample_pending" THEN 'Muestras pendientes'::"text"
            WHEN "has_shipping_upcoming" THEN 'Shipping prÃ³ximo'::"text"
            ELSE 'Sin alertas'::"text"
        END AS "primary_action_label",
    "concat_ws"(' Â· '::"text", ((NULLIF("critical_count", 0))::"text" || ' critical'::"text"), ((NULLIF("warning_count", 0))::"text" || ' warning'::"text"), ((NULLIF("monitor_count", 0))::"text" || ' monitor'::"text")) AS "alert_summary"
   FROM "grouped";


ALTER VIEW "public"."vw_customer_daily_alert_summary_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_daily_alert_summary_v2" AS
 WITH "grouped" AS (
         SELECT "vw_customer_daily_alert_events_v2"."operational_group_key",
            "vw_customer_daily_alert_events_v2"."customer",
            "vw_customer_daily_alert_events_v2"."season",
            "vw_customer_daily_alert_events_v2"."supplier",
            "vw_customer_daily_alert_events_v2"."etd_pi",
            "vw_customer_daily_alert_events_v2"."po_id_list",
            "vw_customer_daily_alert_events_v2"."po_list",
            "vw_customer_daily_alert_events_v2"."reference",
            "vw_customer_daily_alert_events_v2"."style",
            "vw_customer_daily_alert_events_v2"."color",
            "max"("vw_customer_daily_alert_events_v2"."qty_total") AS "qty_total",
            "count"(*) AS "alert_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v2"."alert_level" = 'CRITICAL'::"text")) AS "critical_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v2"."alert_level" = 'WARNING'::"text")) AS "warning_count",
            "count"(*) FILTER (WHERE ("vw_customer_daily_alert_events_v2"."alert_level" = 'MONITOR'::"text")) AS "monitor_count",
            "min"("vw_customer_daily_alert_events_v2"."priority") AS "top_priority",
            "min"("vw_customer_daily_alert_events_v2"."sort_order") AS "top_sort_order"
           FROM "public"."vw_customer_daily_alert_events_v2"
          GROUP BY "vw_customer_daily_alert_events_v2"."operational_group_key", "vw_customer_daily_alert_events_v2"."customer", "vw_customer_daily_alert_events_v2"."season", "vw_customer_daily_alert_events_v2"."supplier", "vw_customer_daily_alert_events_v2"."etd_pi", "vw_customer_daily_alert_events_v2"."po_id_list", "vw_customer_daily_alert_events_v2"."po_list", "vw_customer_daily_alert_events_v2"."reference", "vw_customer_daily_alert_events_v2"."style", "vw_customer_daily_alert_events_v2"."color"
        ), "top_event" AS (
         SELECT DISTINCT ON ("vw_customer_daily_alert_events_v2"."operational_group_key") "vw_customer_daily_alert_events_v2"."operational_group_key",
            "vw_customer_daily_alert_events_v2"."alert_event" AS "top_alert_event",
            "vw_customer_daily_alert_events_v2"."alert_level" AS "top_alert_level",
            "vw_customer_daily_alert_events_v2"."alert_title" AS "top_alert_title",
            "vw_customer_daily_alert_events_v2"."alert_message" AS "top_alert_message"
           FROM "public"."vw_customer_daily_alert_events_v2"
          ORDER BY "vw_customer_daily_alert_events_v2"."operational_group_key", "vw_customer_daily_alert_events_v2"."priority", "vw_customer_daily_alert_events_v2"."sort_order", "vw_customer_daily_alert_events_v2"."alert_event"
        )
 SELECT "g"."operational_group_key",
    "g"."customer",
    "g"."season",
    "g"."supplier",
    "g"."etd_pi",
    "g"."po_id_list",
    "g"."po_list",
    "g"."reference",
    "g"."style",
    "g"."color",
    "g"."qty_total",
    COALESCE("t"."top_alert_level", 'OK'::"text") AS "alert_level",
    COALESCE("g"."top_priority", 9) AS "priority",
    COALESCE("g"."top_sort_order", 99) AS "sort_order",
    "t"."top_alert_event",
    "t"."top_alert_title",
    "t"."top_alert_message",
    "g"."alert_count",
    "g"."critical_count",
    "g"."warning_count",
    "g"."monitor_count",
    CURRENT_DATE AS "summary_date",
    "now"() AS "generated_at"
   FROM ("grouped" "g"
     LEFT JOIN "top_event" "t" ON (("t"."operational_group_key" = "g"."operational_group_key")));


ALTER VIEW "public"."vw_customer_daily_alert_summary_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_daily_alerts" AS
 WITH "base" AS (
         SELECT "b"."customer",
            "b"."season",
            "b"."supplier",
            "b"."etd_pi",
            "b"."po_id_list",
            "b"."po_list",
            "b"."reference",
            "b"."style",
            "b"."color",
            "b"."qty_total",
            "b"."cfms_status",
            "b"."counters_status",
            "b"."fittings_status",
            "b"."pps_status",
            "b"."testings_status",
            "b"."shippings_status",
            "b"."trial_upper",
            "b"."trial_lasting",
            "b"."lasting",
            "b"."inspection",
                CASE
                    WHEN ("b"."booking" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("b"."booking")::"date"
                    ELSE NULL::"date"
                END AS "booking_date",
                CASE
                    WHEN ("b"."closing" ~ '^\d{4}-\d{2}-\d{2}$'::"text") THEN ("b"."closing")::"date"
                    ELSE NULL::"date"
                END AS "closing_date",
            "b"."shipping_date"
           FROM ("public"."vw_customer_campaign_board_v1" "b"
             JOIN "public"."production_active_seasons" "s" ON ((("s"."season" = "b"."season") AND ("s"."is_active" = true))))
        ), "alerts" AS (
         SELECT "base"."customer",
            "base"."season",
            "base"."supplier",
            "base"."etd_pi",
            "base"."po_id_list",
            "base"."po_list",
            "base"."reference",
            "base"."style",
            "base"."color",
            "base"."qty_total",
            "base"."cfms_status",
            "base"."counters_status",
            "base"."fittings_status",
            "base"."pps_status",
            "base"."testings_status",
            "base"."shippings_status",
            "base"."trial_upper",
            "base"."trial_lasting",
            "base"."lasting",
            "base"."inspection",
            "base"."booking_date",
            "base"."closing_date",
            "base"."shipping_date",
            ("base"."etd_pi" - CURRENT_DATE) AS "days_to_etd",
                CASE
                    WHEN ("base"."etd_pi" IS NULL) THEN 'NO_ETD'::"text"
                    WHEN ("base"."etd_pi" < CURRENT_DATE) THEN 'OVERDUE'::"text"
                    WHEN ("base"."etd_pi" <= (CURRENT_DATE + '7 days'::interval)) THEN 'THIS_WEEK'::"text"
                    WHEN ("base"."etd_pi" <= (CURRENT_DATE + '14 days'::interval)) THEN 'NEXT_2_WEEKS'::"text"
                    ELSE 'FUTURE'::"text"
                END AS "etd_bucket",
            (("base"."cfms_status" = 'Rechazado'::"text") OR ("base"."counters_status" = 'Rechazado'::"text") OR ("base"."fittings_status" = 'Rechazado'::"text") OR ("base"."pps_status" = 'Rechazado'::"text") OR ("base"."testings_status" = 'Rechazado'::"text") OR ("base"."shippings_status" = 'Rechazado'::"text")) AS "has_rejected_sample",
            (("base"."cfms_status" = 'Pendiente'::"text") OR ("base"."counters_status" = 'Pendiente'::"text") OR ("base"."fittings_status" = 'Pendiente'::"text") OR ("base"."pps_status" = 'Pendiente'::"text") OR ("base"."testings_status" = 'Pendiente'::"text") OR ("base"."shippings_status" = 'Pendiente'::"text")) AS "has_pending_sample",
            (("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" <= (CURRENT_DATE + '14 days'::interval)) AND ("base"."shipping_date" IS NULL)) AS "etd_soon",
            (("base"."inspection" IS NULL) AND ("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" <= (CURRENT_DATE + '10 days'::interval))) AS "inspection_due",
            (("base"."booking_date" IS NULL) AND ("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" <= (CURRENT_DATE + '7 days'::interval))) AS "booking_due",
            (("base"."closing_date" IS NULL) AND ("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" <= (CURRENT_DATE + '5 days'::interval))) AS "closing_due",
            (("base"."shipping_date" IS NULL) AND ("base"."etd_pi" IS NOT NULL) AND ("base"."etd_pi" < CURRENT_DATE)) AS "shipping_overdue"
           FROM "base"
        ), "classified" AS (
         SELECT "alerts"."customer",
            "alerts"."season",
            "alerts"."supplier",
            "alerts"."etd_pi",
            "alerts"."po_id_list",
            "alerts"."po_list",
            "alerts"."reference",
            "alerts"."style",
            "alerts"."color",
            "alerts"."qty_total",
            "alerts"."cfms_status",
            "alerts"."counters_status",
            "alerts"."fittings_status",
            "alerts"."pps_status",
            "alerts"."testings_status",
            "alerts"."shippings_status",
            "alerts"."trial_upper",
            "alerts"."trial_lasting",
            "alerts"."lasting",
            "alerts"."inspection",
            "alerts"."booking_date",
            "alerts"."closing_date",
            "alerts"."shipping_date",
            "alerts"."days_to_etd",
            "alerts"."etd_bucket",
            "alerts"."has_rejected_sample",
            "alerts"."has_pending_sample",
            "alerts"."etd_soon",
            "alerts"."inspection_due",
            "alerts"."booking_due",
            "alerts"."closing_due",
            "alerts"."shipping_overdue",
                CASE
                    WHEN ("alerts"."has_rejected_sample" OR "alerts"."shipping_overdue") THEN 'CRITICAL'::"text"
                    WHEN ("alerts"."inspection_due" OR "alerts"."booking_due" OR "alerts"."closing_due") THEN 'WARNING'::"text"
                    WHEN ("alerts"."has_pending_sample" OR "alerts"."etd_soon") THEN 'MONITOR'::"text"
                    ELSE 'OK'::"text"
                END AS "alert_level",
                CASE
                    WHEN "alerts"."has_rejected_sample" THEN 'SAMPLE_REJECTED'::"text"
                    WHEN "alerts"."shipping_overdue" THEN 'SHIPPING_OVERDUE'::"text"
                    WHEN "alerts"."inspection_due" THEN 'INSPECTION_DUE'::"text"
                    WHEN "alerts"."booking_due" THEN 'BOOKING_DUE'::"text"
                    WHEN "alerts"."closing_due" THEN 'CLOSING_DUE'::"text"
                    WHEN "alerts"."has_pending_sample" THEN 'SAMPLE_PENDING'::"text"
                    WHEN "alerts"."etd_soon" THEN 'ETD_SOON'::"text"
                    ELSE 'OK'::"text"
                END AS "primary_alert_type"
           FROM "alerts"
        )
 SELECT "md5"("concat_ws"('|'::"text", "customer", "season", "supplier", ("etd_pi")::"text", "reference", "style", "color")) AS "alert_group_id",
    "customer",
    "season",
    "supplier",
    "etd_pi",
    "po_id_list",
    "po_list",
    "reference",
    "style",
    "color",
    "qty_total",
    "cfms_status",
    "counters_status",
    "fittings_status",
    "pps_status",
    "testings_status",
    "shippings_status",
    "trial_upper",
    "trial_lasting",
    "lasting",
    "inspection",
    "booking_date",
    "closing_date",
    "shipping_date",
    "has_rejected_sample",
    "has_pending_sample",
    "etd_soon",
    "inspection_due",
    "booking_due",
    "closing_due",
    "shipping_overdue",
    "alert_level",
    "primary_alert_type",
        CASE
            WHEN ("primary_alert_type" = 'SAMPLE_REJECTED'::"text") THEN 'Hay muestras rechazadas.'::"text"
            WHEN ("primary_alert_type" = 'SHIPPING_OVERDUE'::"text") THEN 'Shipping vencido respecto al ETD PI.'::"text"
            WHEN ("primary_alert_type" = 'INSPECTION_DUE'::"text") THEN 'Inspection pendiente con ETD prÃ³ximo.'::"text"
            WHEN ("primary_alert_type" = 'BOOKING_DUE'::"text") THEN 'Booking pendiente con ETD prÃ³ximo.'::"text"
            WHEN ("primary_alert_type" = 'CLOSING_DUE'::"text") THEN 'Closing pendiente con ETD prÃ³ximo.'::"text"
            WHEN ("primary_alert_type" = 'SAMPLE_PENDING'::"text") THEN 'Hay muestras pendientes.'::"text"
            WHEN ("primary_alert_type" = 'ETD_SOON'::"text") THEN 'ETD PI prÃ³ximo.'::"text"
            ELSE 'Sin alerta operativa.'::"text"
        END AS "alert_reason",
        CASE
            WHEN ("alert_level" = 'CRITICAL'::"text") THEN 1
            WHEN ("alert_level" = 'WARNING'::"text") THEN 2
            WHEN ("alert_level" = 'MONITOR'::"text") THEN 3
            ELSE 9
        END AS "alert_priority",
    "days_to_etd",
    "etd_bucket",
        CASE
            WHEN ("alert_level" <> 'OK'::"text") THEN true
            ELSE false
        END AS "has_any_alert"
   FROM "classified";


ALTER VIEW "public"."vw_customer_daily_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_qc_trial_bridge_v1" AS
 SELECT "b"."customer",
    "b"."season",
    "b"."supplier",
    "b"."etd_pi",
    "b"."po_id_list",
    "b"."po_list",
    "b"."reference",
    "b"."style",
    "b"."color",
    "b"."qty_total",
    "b"."trial_upper",
    "b"."trial_lasting",
    "b"."lasting",
    "q"."id" AS "qc_inspection_id",
    "q"."report_number",
    "q"."inspection_type",
    "q"."inspection_date",
    "q"."inspector",
    "q"."factory",
    "q"."aql_result",
    "q"."critical_found",
    "q"."major_found",
    "q"."minor_found",
        CASE
            WHEN ("q"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "has_qc_report",
        CASE
            WHEN ("q"."id" IS NULL) THEN 'QC_PENDING'::"text"
            WHEN ("q"."aql_result" ~~* '%fail%'::"text") THEN 'QC_FAILED'::"text"
            WHEN (("q"."critical_found" > 0) OR ("q"."major_found" > 0) OR ("q"."minor_found" > 0)) THEN 'QC_ISSUES'::"text"
            ELSE 'QC_OK'::"text"
        END AS "qc_status",
        CASE
            WHEN ("q"."id" IS NULL) THEN 'No hay reporte QC vinculado.'::"text"
            WHEN ("q"."aql_result" ~~* '%fail%'::"text") THEN 'Reporte QC fallido.'::"text"
            WHEN (("q"."critical_found" > 0) OR ("q"."major_found" > 0) OR ("q"."minor_found" > 0)) THEN 'Reporte QC con incidencias.'::"text"
            ELSE 'Reporte QC recibido.'::"text"
        END AS "qc_status_label",
        CASE
            WHEN (("q"."inspection_type" ~~* 'T4-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Stitching%'::"text")) THEN 'TRIAL_UPPER'::"text"
            WHEN (("q"."inspection_type" ~~* 'T5-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Lasting%'::"text")) THEN 'TRIAL_LASTING'::"text"
            WHEN (("q"."inspection_type" ~~* 'T6-%'::"text") OR ("q"."inspection_type" ~~* '%Assembling%'::"text")) THEN 'ASSEMBLING'::"text"
            WHEN (("q"."inspection_type" ~~* 'T7-%'::"text") OR ("q"."inspection_type" ~~* '%FPI%'::"text") OR ("q"."inspection_type" ~~* '%Final%'::"text")) THEN 'FINAL_INSPECTION'::"text"
            WHEN ("q"."id" IS NOT NULL) THEN 'QC_REPORT'::"text"
            ELSE NULL::"text"
        END AS "qc_process_stage",
        CASE
            WHEN (("q"."inspection_type" ~~* 'T4-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Stitching%'::"text")) THEN 'Trial Upper'::"text"
            WHEN (("q"."inspection_type" ~~* 'T5-%'::"text") OR ("q"."inspection_type" ~~* '%Trial Lasting%'::"text")) THEN 'Trial Lasting'::"text"
            WHEN (("q"."inspection_type" ~~* 'T6-%'::"text") OR ("q"."inspection_type" ~~* '%Assembling%'::"text")) THEN 'Assembling'::"text"
            WHEN (("q"."inspection_type" ~~* 'T7-%'::"text") OR ("q"."inspection_type" ~~* '%FPI%'::"text") OR ("q"."inspection_type" ~~* '%Final%'::"text")) THEN 'Final Inspection'::"text"
            WHEN ("q"."id" IS NOT NULL) THEN 'QC Report'::"text"
            ELSE NULL::"text"
        END AS "qc_process_label"
   FROM ("public"."vw_customer_campaign_board_v1" "b"
     LEFT JOIN "public"."qc_inspections" "q" ON ((("q"."customer" = "b"."customer") AND ("q"."season" = "b"."season") AND ("q"."reference" = "b"."reference") AND ("q"."style" = "b"."style") AND ("lower"("replace"("replace"("replace"(TRIM(BOTH FROM "q"."color"), 'Ã³'::"text", 'o'::"text"), 'Ã“'::"text", 'O'::"text"), 'ï¿½'::"text", 'o'::"text")) = "lower"("replace"("replace"("replace"(TRIM(BOTH FROM "b"."color"), 'Ã³'::"text", 'o'::"text"), 'Ã“'::"text", 'O'::"text"), 'ï¿½'::"text", 'o'::"text"))))))
  WHERE ("b"."season" IN ( SELECT "production_active_seasons"."season"
           FROM "public"."production_active_seasons"
          WHERE ("production_active_seasons"."is_active" = true)));


ALTER VIEW "public"."vw_customer_qc_trial_bridge_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_customer_timeline_pressure" AS
 SELECT "customer",
    "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_production_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "production_late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
    "count"(*) FILTER (WHERE "has_booking_delay_basis") AS "lines_with_booking_basis",
    "count"(*) FILTER (WHERE ("booking_delay_flag" = true)) AS "booking_late_lines",
    "round"("avg"("booking_delay_days"), 2) AS "avg_booking_delay_days",
    "max"("booking_delay_days") AS "max_booking_delay_days",
    "round"(((("sum"(
        CASE
            WHEN ("booking_delay_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct"
   FROM "public"."vw_fact_operacion_timeline"
  GROUP BY "customer", "season";


ALTER VIEW "public"."vw_customer_timeline_pressure" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_delay_by_customer" AS
 SELECT "customer",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "customer";


ALTER VIEW "public"."vw_delay_by_customer" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_delay_by_factory" AS
 SELECT "factory",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "factory";


ALTER VIEW "public"."vw_delay_by_factory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_exec_customer_ranking" AS
 SELECT "customer",
    "season",
    "quote_count",
    "matched_order_count",
    "approx_conversion_rate_pct",
    "avg_days_quote_to_order",
    "avg_gap_order_vs_quote_sell_pct",
    "avg_revision_count",
    "rank"() OVER (ORDER BY "approx_conversion_rate_pct" DESC NULLS LAST, "quote_count" DESC) AS "rank_conversion",
    "rank"() OVER (ORDER BY "avg_revision_count" DESC NULLS LAST, "quote_count" DESC) AS "rank_negotiation",
    "rank"() OVER (ORDER BY "avg_gap_order_vs_quote_sell_pct") AS "rank_price_compression"
   FROM "public"."vw_dev_conversion_by_customer";


ALTER VIEW "public"."vw_dev_exec_customer_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_exec_summary" AS
 SELECT "count"(*) AS "quote_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "count"(DISTINCT "variante_id") AS "variante_count",
    "count"(DISTINCT "season") AS "season_count",
    "round"("avg"("quote_buy_price"), 4) AS "avg_quote_buy_price",
    "round"("avg"("quote_sell_price"), 4) AS "avg_quote_sell_price",
    "round"("avg"("quote_margin_pct"), 2) AS "avg_quote_margin_pct",
    "round"("avg"("quote_margin_amount"), 4) AS "avg_quote_margin_amount",
    "round"("avg"("gap_vs_master_buy"), 4) AS "avg_gap_vs_master_buy",
    "round"("avg"("gap_vs_master_sell"), 4) AS "avg_gap_vs_master_sell",
    "round"("avg"("gap_vs_master_sell_pct"), 2) AS "avg_gap_vs_master_sell_pct",
    "round"("avg"("revision_count_inferred"), 2) AS "avg_revision_count",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("quote_status", ''::"text")) = ANY (ARRAY['enviada'::"text", 'negociando'::"text"]))) AS "active_quote_count",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("quote_status", ''::"text")) = ANY (ARRAY['approved'::"text", 'aprobada'::"text"]))) AS "approved_quote_count",
    "count"(*) FILTER (WHERE ("lower"(COALESCE("quote_status", ''::"text")) = ANY (ARRAY['rejected'::"text", 'rechazada'::"text"]))) AS "rejected_quote_count"
   FROM "public"."vw_dev_quote_fact";


ALTER VIEW "public"."vw_dev_exec_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_model_price_dispersion" AS
 SELECT "customer",
    "season",
    "style",
    "color",
    "factory",
    "count"(*) AS "quote_count",
    "min"("quote_sell_price") AS "min_quote_sell_price",
    "max"("quote_sell_price") AS "max_quote_sell_price",
    "round"("avg"("quote_sell_price"), 4) AS "avg_quote_sell_price",
    "round"("stddev_pop"("quote_sell_price"), 4) AS "stddev_quote_sell_price",
    "min"("quote_buy_price") AS "min_quote_buy_price",
    "max"("quote_buy_price") AS "max_quote_buy_price",
    "round"("avg"("quote_buy_price"), 4) AS "avg_quote_buy_price",
    "max"("revision_count_inferred") AS "revision_count_inferred"
   FROM "public"."vw_dev_quote_fact"
  GROUP BY "customer", "season", "style", "color", "factory";


ALTER VIEW "public"."vw_dev_model_price_dispersion" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_price_evolution" AS
 SELECT "customer",
    "season",
    "style",
    "color",
    "quote_year_month",
    "count"(*) AS "quote_count",
    "round"("avg"("quote_buy_price"), 4) AS "avg_quote_buy_price",
    "round"("avg"("quote_sell_price"), 4) AS "avg_quote_sell_price",
    "round"("avg"("quote_margin_pct"), 2) AS "avg_quote_margin_pct",
    "round"("avg"("quote_margin_amount"), 4) AS "avg_quote_margin_amount",
    "min"("quote_sell_price") AS "min_quote_sell_price",
    "max"("quote_sell_price") AS "max_quote_sell_price"
   FROM "public"."vw_dev_quote_fact"
  GROUP BY "customer", "season", "style", "color", "quote_year_month";


ALTER VIEW "public"."vw_dev_price_evolution" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_pricing_instability_ranking" AS
 SELECT "customer",
    "season",
    "style",
    "color",
    "factory",
    "quote_count",
    "avg_quote_sell_price",
    "stddev_quote_sell_price",
    "revision_count_inferred",
    "rank"() OVER (ORDER BY "stddev_quote_sell_price" DESC NULLS LAST, "quote_count" DESC) AS "pricing_instability_rank"
   FROM "public"."vw_dev_model_price_dispersion"
  WHERE ("quote_count" >= 2);


ALTER VIEW "public"."vw_dev_pricing_instability_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_dev_quote_vs_master" AS
 SELECT "customer",
    "season",
    "style",
    "color",
    "factory",
    "currency",
    "quote_status",
    "count"(*) AS "quote_count",
    "round"("avg"("quote_buy_price"), 4) AS "avg_quote_buy_price",
    "round"("avg"("quote_sell_price"), 4) AS "avg_quote_sell_price",
    "round"("avg"("master_buy_price"), 4) AS "avg_master_buy_price",
    "round"("avg"("master_sell_price"), 4) AS "avg_master_sell_price",
    "round"("avg"("gap_vs_master_buy"), 4) AS "avg_gap_vs_master_buy",
    "round"("avg"("gap_vs_master_sell"), 4) AS "avg_gap_vs_master_sell",
    "round"("avg"("gap_vs_master_sell_pct"), 2) AS "avg_gap_vs_master_sell_pct"
   FROM "public"."vw_dev_quote_fact"
  GROUP BY "customer", "season", "style", "color", "factory", "currency", "quote_status";


ALTER VIEW "public"."vw_dev_quote_vs_master" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_action_queue_v1" AS
 SELECT "id",
    "action_key",
    "source_view",
    "source_type",
    "source_entity_type",
    "source_entity_id",
    "customer",
    "factory",
    "season",
    "module",
    "priority",
        CASE "priority"
            WHEN 'CRITICAL'::"public"."executive_action_priority" THEN 1
            WHEN 'HIGH'::"public"."executive_action_priority" THEN 2
            WHEN 'MEDIUM'::"public"."executive_action_priority" THEN 3
            WHEN 'LOW'::"public"."executive_action_priority" THEN 4
            ELSE 9
        END AS "priority_rank",
    "status",
        CASE "status"
            WHEN 'OPEN'::"public"."executive_action_status" THEN 1
            WHEN 'IN_PROGRESS'::"public"."executive_action_status" THEN 2
            WHEN 'WAITING'::"public"."executive_action_status" THEN 3
            WHEN 'RESOLVED'::"public"."executive_action_status" THEN 8
            WHEN 'DISMISSED'::"public"."executive_action_status" THEN 9
            ELSE 99
        END AS "status_rank",
    "title",
    "description",
    "recommended_action",
    "owner_user_id",
    "owner_label",
    "first_detected_at",
    "last_seen_at",
    "due_date",
    "resolved_at",
    "resolution_note",
    "metadata",
    "created_at",
    "updated_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."executive_action_notes" "n"
          WHERE ("n"."action_id" = "ea"."id")) AS "notes_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."executive_action_decisions" "d"
          WHERE ("d"."action_id" = "ea"."id")) AS "decisions_count"
   FROM "public"."executive_actions" "ea"
  ORDER BY
        CASE "status"
            WHEN 'OPEN'::"public"."executive_action_status" THEN 1
            WHEN 'IN_PROGRESS'::"public"."executive_action_status" THEN 2
            WHEN 'WAITING'::"public"."executive_action_status" THEN 3
            WHEN 'RESOLVED'::"public"."executive_action_status" THEN 8
            WHEN 'DISMISSED'::"public"."executive_action_status" THEN 9
            ELSE 99
        END,
        CASE "priority"
            WHEN 'CRITICAL'::"public"."executive_action_priority" THEN 1
            WHEN 'HIGH'::"public"."executive_action_priority" THEN 2
            WHEN 'MEDIUM'::"public"."executive_action_priority" THEN 3
            WHEN 'LOW'::"public"."executive_action_priority" THEN 4
            ELSE 9
        END, "last_seen_at" DESC;


ALTER VIEW "public"."vw_exec_action_queue_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_cross_module_risk_v2" AS
 WITH "base" AS (
         SELECT "i"."customer",
            "i"."alert_level",
            "i"."alert_type",
            "i"."alert_reason",
            "i"."recommended_action",
            "i"."alert_priority",
            "i"."contextual_business_profile",
            "i"."contextual_business_score",
            "i"."customer_friction_score",
            "i"."health_signal",
            "i"."volume_signal",
            "i"."qty_growth_pct",
            "i"."sell_growth_pct",
            "i"."score_model",
            "c"."po_count",
            "c"."line_count",
            "c"."factory_count",
            "c"."model_count",
            "c"."qty_total",
            "c"."sell_amount_total",
            "c"."contribution_total",
            "c"."contribution_pct",
            "c"."production_late_rate_pct",
            "c"."avg_delay_production_days",
            "c"."max_delay_production_days",
            "c"."executive_tier",
            "d"."negotiation_score",
            "d"."negotiation_profile",
            "d"."avg_revisions",
            "d"."avg_days_to_order"
           FROM (("public"."vw_exec_intelligence_focus_v1" "i"
             LEFT JOIN "public"."vw_exec_customer_ranking" "c" ON (("c"."customer" = "i"."customer")))
             LEFT JOIN "public"."vw_dev_customer_negotiation_score" "d" ON (("d"."customer" = "i"."customer")))
        ), "scored" AS (
         SELECT "base"."customer",
            "base"."alert_level",
            "base"."alert_type",
            "base"."alert_reason",
            "base"."recommended_action",
            "base"."alert_priority",
            "base"."contextual_business_profile",
            "base"."contextual_business_score",
            "base"."customer_friction_score",
            "base"."health_signal",
            "base"."volume_signal",
            "base"."qty_growth_pct",
            "base"."sell_growth_pct",
            "base"."score_model",
            "base"."po_count",
            "base"."line_count",
            "base"."factory_count",
            "base"."model_count",
            "base"."qty_total",
            "base"."sell_amount_total",
            "base"."contribution_total",
            "base"."contribution_pct",
            "base"."production_late_rate_pct",
            "base"."avg_delay_production_days",
            "base"."max_delay_production_days",
            "base"."executive_tier",
            "base"."negotiation_score",
            "base"."negotiation_profile",
            "base"."avg_revisions",
            "base"."avg_days_to_order",
                CASE
                    WHEN ("base"."alert_level" = 'CRITICAL'::"text") THEN 45
                    WHEN ("base"."alert_level" = 'WARNING'::"text") THEN 25
                    WHEN ("base"."alert_level" = 'MONITOR'::"text") THEN 10
                    ELSE 0
                END AS "commercial_risk_points",
                CASE
                    WHEN ("base"."production_late_rate_pct" >= (60)::numeric) THEN 35
                    WHEN ("base"."production_late_rate_pct" >= (40)::numeric) THEN 25
                    WHEN ("base"."production_late_rate_pct" >= (20)::numeric) THEN 15
                    WHEN ("base"."production_late_rate_pct" >= (10)::numeric) THEN 8
                    ELSE 0
                END AS "production_risk_points",
                CASE
                    WHEN ("base"."contribution_pct" < (8)::numeric) THEN 18
                    WHEN ("base"."contribution_pct" < (10)::numeric) THEN 12
                    WHEN ("base"."contribution_pct" < (12)::numeric) THEN 8
                    ELSE 0
                END AS "margin_risk_points",
                CASE
                    WHEN ("base"."negotiation_profile" = 'AGGRESSIVE'::"text") THEN 15
                    WHEN ("base"."negotiation_profile" = 'NORMAL'::"text") THEN 5
                    ELSE 0
                END AS "development_risk_points",
                CASE
                    WHEN (("base"."factory_count" = 1) AND ("base"."sell_amount_total" > (0)::numeric)) THEN 10
                    ELSE 0
                END AS "concentration_risk_points"
           FROM "base"
        ), "drivers" AS (
         SELECT "scored"."customer",
            "scored"."alert_level",
            "scored"."alert_type",
            "scored"."alert_reason",
            "scored"."recommended_action",
            "scored"."alert_priority",
            "scored"."contextual_business_profile",
            "scored"."contextual_business_score",
            "scored"."customer_friction_score",
            "scored"."health_signal",
            "scored"."volume_signal",
            "scored"."qty_growth_pct",
            "scored"."sell_growth_pct",
            "scored"."score_model",
            "scored"."po_count",
            "scored"."line_count",
            "scored"."factory_count",
            "scored"."model_count",
            "scored"."qty_total",
            "scored"."sell_amount_total",
            "scored"."contribution_total",
            "scored"."contribution_pct",
            "scored"."production_late_rate_pct",
            "scored"."avg_delay_production_days",
            "scored"."max_delay_production_days",
            "scored"."executive_tier",
            "scored"."negotiation_score",
            "scored"."negotiation_profile",
            "scored"."avg_revisions",
            "scored"."avg_days_to_order",
            "scored"."commercial_risk_points",
            "scored"."production_risk_points",
            "scored"."margin_risk_points",
            "scored"."development_risk_points",
            "scored"."concentration_risk_points",
            GREATEST("scored"."commercial_risk_points", "scored"."production_risk_points", "scored"."margin_risk_points", "scored"."development_risk_points", "scored"."concentration_risk_points") AS "max_driver_points",
            (((("scored"."commercial_risk_points" + "scored"."production_risk_points") + "scored"."margin_risk_points") + "scored"."development_risk_points") + "scored"."concentration_risk_points") AS "raw_risk_score"
           FROM "scored"
        ), "classified" AS (
         SELECT "drivers"."customer",
            "drivers"."alert_level",
            "drivers"."alert_type",
            "drivers"."alert_reason",
            "drivers"."recommended_action",
            "drivers"."alert_priority",
            "drivers"."contextual_business_profile",
            "drivers"."contextual_business_score",
            "drivers"."customer_friction_score",
            "drivers"."health_signal",
            "drivers"."volume_signal",
            "drivers"."qty_growth_pct",
            "drivers"."sell_growth_pct",
            "drivers"."score_model",
            "drivers"."po_count",
            "drivers"."line_count",
            "drivers"."factory_count",
            "drivers"."model_count",
            "drivers"."qty_total",
            "drivers"."sell_amount_total",
            "drivers"."contribution_total",
            "drivers"."contribution_pct",
            "drivers"."production_late_rate_pct",
            "drivers"."avg_delay_production_days",
            "drivers"."max_delay_production_days",
            "drivers"."executive_tier",
            "drivers"."negotiation_score",
            "drivers"."negotiation_profile",
            "drivers"."avg_revisions",
            "drivers"."avg_days_to_order",
            "drivers"."commercial_risk_points",
            "drivers"."production_risk_points",
            "drivers"."margin_risk_points",
            "drivers"."development_risk_points",
            "drivers"."concentration_risk_points",
            "drivers"."max_driver_points",
            "drivers"."raw_risk_score",
            LEAST(100, "drivers"."raw_risk_score") AS "cross_module_risk_score",
                CASE
                    WHEN ("drivers"."commercial_risk_points" = "drivers"."max_driver_points") THEN 'COMMERCIAL'::"text"
                    WHEN ("drivers"."production_risk_points" = "drivers"."max_driver_points") THEN 'PRODUCTION'::"text"
                    WHEN ("drivers"."margin_risk_points" = "drivers"."max_driver_points") THEN 'MARGIN'::"text"
                    WHEN ("drivers"."development_risk_points" = "drivers"."max_driver_points") THEN 'DEVELOPMENT'::"text"
                    WHEN ("drivers"."concentration_risk_points" = "drivers"."max_driver_points") THEN 'CONCENTRATION'::"text"
                    ELSE 'NONE'::"text"
                END AS "primary_driver",
                CASE
                    WHEN ("drivers"."alert_level" = 'CRITICAL'::"text") THEN 'CRITICAL'::"text"
                    WHEN (LEAST(100, "drivers"."raw_risk_score") >= 70) THEN 'CRITICAL'::"text"
                    WHEN (LEAST(100, "drivers"."raw_risk_score") >= 45) THEN 'WARNING'::"text"
                    WHEN (LEAST(100, "drivers"."raw_risk_score") >= 25) THEN 'MONITOR'::"text"
                    ELSE 'HEALTHY'::"text"
                END AS "cross_module_risk_level"
           FROM "drivers"
        )
 SELECT "customer",
    "cross_module_risk_score",
    "cross_module_risk_level",
    "primary_driver",
        CASE
            WHEN (("primary_driver" = 'COMMERCIAL'::"text") AND ("alert_level" = 'CRITICAL'::"text") AND ("production_risk_points" >= 15)) THEN 'Cliente con seÃ±al comercial crÃ­tica y riesgo operativo elevado.'::"text"
            WHEN (("primary_driver" = 'COMMERCIAL'::"text") AND ("alert_level" = 'CRITICAL'::"text")) THEN 'Cliente con seÃ±al comercial crÃ­tica.'::"text"
            WHEN (("primary_driver" = 'COMMERCIAL'::"text") AND ("alert_level" = 'WARNING'::"text") AND ("production_risk_points" >= 25)) THEN 'Cliente con warning comercial y retrasos de producciÃ³n significativos.'::"text"
            WHEN (("primary_driver" = 'COMMERCIAL'::"text") AND ("alert_level" = 'WARNING'::"text")) THEN 'Cliente con warning comercial relevante.'::"text"
            WHEN (("primary_driver" = 'PRODUCTION'::"text") AND ("production_risk_points" >= 35)) THEN 'Cliente con riesgo operativo severo por retrasos de producciÃ³n.'::"text"
            WHEN ("primary_driver" = 'PRODUCTION'::"text") THEN 'Cliente con riesgo operativo por retrasos de producciÃ³n.'::"text"
            WHEN ("primary_driver" = 'MARGIN'::"text") THEN 'Cliente con presiÃ³n de margen relevante.'::"text"
            WHEN ("primary_driver" = 'DEVELOPMENT'::"text") THEN 'Cliente con fricciÃ³n alta en desarrollo y negociaciÃ³n.'::"text"
            WHEN ("primary_driver" = 'CONCENTRATION'::"text") THEN 'Cliente con dependencia elevada de una Ãºnica fÃ¡brica.'::"text"
            ELSE 'Cliente sin riesgo cross-module elevado.'::"text"
        END AS "executive_summary",
        CASE
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'COMMERCIAL'::"text")) THEN 'Revisar situaciÃ³n comercial inmediatamente y preparar acciÃ³n con cliente.'::"text"
            WHEN (("cross_module_risk_level" = 'CRITICAL'::"text") AND ("primary_driver" = 'PRODUCTION'::"text")) THEN 'Revisar plan de producciÃ³n, fÃ¡brica responsable y fechas comprometidas.'::"text"
            WHEN (("cross_module_risk_level" = 'WARNING'::"text") AND ("production_risk_points" >= 25)) THEN 'Coordinar seguimiento comercial y operativo antes de nuevas decisiones.'::"text"
            WHEN ("cross_module_risk_level" = 'WARNING'::"text") THEN 'Revisar causa principal del riesgo antes de nueva campaÃ±a.'::"text"
            WHEN ("cross_module_risk_level" = 'MONITOR'::"text") THEN 'Mantener seguimiento en prÃ³ximos ciclos.'::"text"
            ELSE 'Sin acciÃ³n urgente.'::"text"
        END AS "recommended_cross_module_action",
    "alert_level",
    "alert_type",
    "alert_reason",
    "recommended_action",
    "commercial_risk_points",
    "production_risk_points",
    "margin_risk_points",
    "development_risk_points",
    "concentration_risk_points",
    "contextual_business_profile",
    "contextual_business_score",
    "customer_friction_score",
    "health_signal",
    "volume_signal",
    "qty_growth_pct",
    "sell_growth_pct",
    "score_model",
    "po_count",
    "line_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "contribution_pct",
    "production_late_rate_pct",
    "avg_delay_production_days",
    "max_delay_production_days",
    "executive_tier",
    "negotiation_score",
    "negotiation_profile",
    "avg_revisions",
    "avg_days_to_order"
   FROM "classified"
  ORDER BY
        CASE "cross_module_risk_level"
            WHEN 'CRITICAL'::"text" THEN 1
            WHEN 'WARNING'::"text" THEN 2
            WHEN 'MONITOR'::"text" THEN 3
            WHEN 'HEALTHY'::"text" THEN 4
            ELSE 9
        END, "cross_module_risk_score" DESC, "customer";


ALTER VIEW "public"."vw_exec_cross_module_risk_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_daily_brief_v1" AS
 SELECT "generated_at",
    "critical_open",
    "without_owner",
    "stale_critical",
    "escalations",
    "critical_customers",
    "warning_customers",
    "total_actions",
    "active_actions",
    "resolved_actions",
    "no_followup_actions",
    "reopened_actions",
    "resolution_risk_actions",
    "stale_actions",
    "avg_resolution_days",
    "max_open_age_days",
    "top_owner",
    "top_driver",
    "workflow_resolution_health",
    "workflow_resolution_score",
    "top_customer",
    "top_customer_risk_level",
    "top_customer_risk_score",
    "top_customer_summary",
    "executive_health",
    "executive_headline",
    "executive_focus",
    "resolution_summary"
   FROM "public"."vw_exec_morning_brief_v1";


ALTER VIEW "public"."vw_exec_daily_brief_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_factory_risk_score" AS
 SELECT "factory",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((((COALESCE(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), (0)::numeric) * 0.50) + (COALESCE("avg"("delay_production_days"), (0)::numeric) * 0.30)) + ((COALESCE("max"("delay_production_days"), 0))::numeric * 0.20)), 2) AS "risk_score",
        CASE
            WHEN ("count"(*) FILTER (WHERE "has_production_delay_basis") < 10) THEN 'LOW_SAMPLE'::"text"
            WHEN ((COALESCE(((("sum"(
            CASE
                WHEN ("production_late_flag" = true) THEN 1
                ELSE 0
            END))::numeric / (NULLIF("sum"(
            CASE
                WHEN ("production_late_flag" IS NOT NULL) THEN 1
                ELSE 0
            END), 0))::numeric) * (100)::numeric), (0)::numeric) >= (40)::numeric) OR (COALESCE("avg"("delay_production_days"), (0)::numeric) >= (7)::numeric) OR (COALESCE("max"("delay_production_days"), 0) >= 20)) THEN 'HIGH'::"text"
            WHEN ((COALESCE(((("sum"(
            CASE
                WHEN ("production_late_flag" = true) THEN 1
                ELSE 0
            END))::numeric / (NULLIF("sum"(
            CASE
                WHEN ("production_late_flag" IS NOT NULL) THEN 1
                ELSE 0
            END), 0))::numeric) * (100)::numeric), (0)::numeric) >= (20)::numeric) OR (COALESCE("avg"("delay_production_days"), (0)::numeric) >= (3)::numeric) OR (COALESCE("max"("delay_production_days"), 0) >= 10)) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "risk_level"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "factory";


ALTER VIEW "public"."vw_factory_risk_score" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_factory_ranking" AS
 SELECT "factory",
    "risk_level",
    "risk_score",
    "lines_with_delay_basis",
    "late_lines",
    "production_late_rate_pct",
    "avg_delay_production_days",
    "max_delay_production_days",
    "po_count",
    "customer_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "round"((("contribution_total" / NULLIF("sell_amount_total", (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "rank"() OVER (ORDER BY "contribution_total" DESC NULLS LAST) AS "rank_contribution",
    "rank"() OVER (ORDER BY "qty_total" DESC NULLS LAST) AS "rank_volume",
    "rank"() OVER (ORDER BY "risk_score" DESC NULLS LAST) AS "rank_risk",
    "rank"() OVER (ORDER BY "production_late_rate_pct" DESC NULLS LAST) AS "rank_delay_rate",
        CASE
            WHEN ("lines_with_delay_basis" < 10) THEN 'LOW_SAMPLE'::"text"
            WHEN (("risk_level" = 'HIGH'::"text") AND ("contribution_total" >= (100000)::numeric)) THEN 'CRITICAL'::"text"
            WHEN ("risk_level" = 'HIGH'::"text") THEN 'WATCHLIST'::"text"
            WHEN (("risk_level" = 'MEDIUM'::"text") AND ("contribution_total" >= (75000)::numeric)) THEN 'IMPORTANT'::"text"
            ELSE 'STABLE'::"text"
        END AS "executive_status"
   FROM "public"."vw_factory_risk_score";


ALTER VIEW "public"."vw_exec_factory_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_kpi_dashboard" AS
 WITH "op" AS (
         SELECT "count"(DISTINCT "mv_fact_operacion_linea"."po_id") AS "po_count",
            "count"(*) AS "line_count",
            "count"(DISTINCT "mv_fact_operacion_linea"."customer") AS "customer_count",
            "count"(DISTINCT "mv_fact_operacion_linea"."factory") AS "factory_count",
            "count"(DISTINCT "mv_fact_operacion_linea"."modelo_id") AS "model_count",
            "sum"("mv_fact_operacion_linea"."qty_total") AS "qty_total",
            "round"("sum"("mv_fact_operacion_linea"."sell_amount_real"), 2) AS "sell_amount_total",
            "round"("sum"(COALESCE("mv_fact_operacion_linea"."buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
            "round"("sum"("mv_fact_operacion_linea"."margin_base_amount"), 2) AS "margin_bsg_total",
            "round"("sum"("mv_fact_operacion_linea"."commission_amount"), 2) AS "margin_xiamen_total",
            "round"("sum"("mv_fact_operacion_linea"."contribution_amount"), 2) AS "contribution_total",
            "round"((("sum"("mv_fact_operacion_linea"."contribution_amount") / NULLIF("sum"("mv_fact_operacion_linea"."sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
            "round"((("sum"(
                CASE
                    WHEN ("mv_fact_operacion_linea"."operativa_code" = 'XIAMEN_DIC'::"text") THEN "mv_fact_operacion_linea"."sell_amount_real"
                    ELSE (0)::numeric
                END) / NULLIF("sum"("mv_fact_operacion_linea"."sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
            "round"((("sum"(
                CASE
                    WHEN ("mv_fact_operacion_linea"."operativa_code" = 'BSG'::"text") THEN "mv_fact_operacion_linea"."sell_amount_real"
                    ELSE (0)::numeric
                END) / NULLIF("sum"("mv_fact_operacion_linea"."sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct"
           FROM "public"."mv_fact_operacion_linea"
        ), "prod" AS (
         SELECT "count"(*) FILTER (WHERE "vw_fact_operacion_timeline"."has_production_delay_basis") AS "lines_with_production_basis",
            "count"(*) FILTER (WHERE ("vw_fact_operacion_timeline"."production_late_flag" = true)) AS "production_late_lines",
            "round"("avg"("vw_fact_operacion_timeline"."delay_production_days"), 2) AS "avg_delay_production_days",
            "max"("vw_fact_operacion_timeline"."delay_production_days") AS "max_delay_production_days",
            "round"(((("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" = true) THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
           FROM "public"."vw_fact_operacion_timeline"
        ), "book" AS (
         SELECT "count"(*) FILTER (WHERE "vw_fact_operacion_timeline"."has_booking_delay_basis") AS "lines_with_booking_basis",
            "count"(*) FILTER (WHERE ("vw_fact_operacion_timeline"."booking_delay_flag" = true)) AS "booking_late_lines",
            "round"("avg"("vw_fact_operacion_timeline"."booking_delay_days"), 2) AS "avg_booking_delay_days",
            "max"("vw_fact_operacion_timeline"."booking_delay_days") AS "max_booking_delay_days",
            "round"(((("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."booking_delay_flag" = true) THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."booking_delay_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct"
           FROM "public"."vw_fact_operacion_timeline"
        ), "qc" AS (
         SELECT "count"(*) AS "inspection_count",
            "count"(DISTINCT "vw_qc_inspection_summary"."po_id") AS "inspected_po_count",
            "sum"(COALESCE("vw_qc_inspection_summary"."qty_inspected", 0)) AS "qty_inspected_total",
            "sum"(COALESCE("vw_qc_inspection_summary"."total_defects_found", 0)) AS "total_defects_found",
            "sum"(COALESCE("vw_qc_inspection_summary"."critical_found", 0)) AS "critical_found",
            "sum"(COALESCE("vw_qc_inspection_summary"."major_found", 0)) AS "major_found",
            "sum"(COALESCE("vw_qc_inspection_summary"."minor_found", 0)) AS "minor_found",
            "round"("avg"("vw_qc_inspection_summary"."defect_rate_pct"), 2) AS "avg_defect_rate_pct",
            "max"("vw_qc_inspection_summary"."defect_rate_pct") AS "max_defect_rate_pct",
            "count"(*) FILTER (WHERE ("vw_qc_inspection_summary"."qc_pass_flag" = true)) AS "passed_inspections",
            "count"(*) FILTER (WHERE ("vw_qc_inspection_summary"."qc_pass_flag" = false)) AS "failed_inspections",
            "round"(((("sum"(
                CASE
                    WHEN ("vw_qc_inspection_summary"."qc_pass_flag" = false) THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_qc_inspection_summary"."qc_pass_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "qc_fail_rate_pct",
            "count"(*) FILTER (WHERE ("vw_qc_inspection_summary"."has_critical_defect" = true)) AS "inspections_with_critical"
           FROM "public"."vw_qc_inspection_summary"
        ), "coverage" AS (
         SELECT "round"(((("qc_1"."inspected_po_count")::numeric / (NULLIF("op_1"."po_count", 0))::numeric) * (100)::numeric), 2) AS "po_inspection_coverage_pct"
           FROM ("op" "op_1"
             CROSS JOIN "qc" "qc_1")
        )
 SELECT "op"."po_count",
    "op"."line_count",
    "op"."customer_count",
    "op"."factory_count",
    "op"."model_count",
    "op"."qty_total",
    "op"."sell_amount_total",
    "op"."buy_amount_total",
    "op"."margin_bsg_total",
    "op"."margin_xiamen_total",
    "op"."contribution_total",
    "op"."contribution_pct",
    "op"."xiamen_sales_mix_pct",
    "op"."bsg_sales_mix_pct",
    "prod"."lines_with_production_basis",
    "prod"."production_late_lines",
    "prod"."avg_delay_production_days",
    "prod"."max_delay_production_days",
    "prod"."production_late_rate_pct",
    "book"."lines_with_booking_basis",
    "book"."booking_late_lines",
    "book"."avg_booking_delay_days",
    "book"."max_booking_delay_days",
    "book"."booking_delay_rate_pct",
    "qc"."inspection_count",
    "qc"."inspected_po_count",
    "qc"."qty_inspected_total",
    "qc"."total_defects_found",
    "qc"."critical_found",
    "qc"."major_found",
    "qc"."minor_found",
    "qc"."avg_defect_rate_pct",
    "qc"."max_defect_rate_pct",
    "qc"."passed_inspections",
    "qc"."failed_inspections",
    "qc"."qc_fail_rate_pct",
    "qc"."inspections_with_critical",
    "coverage"."po_inspection_coverage_pct",
    "round"(((((COALESCE("prod"."production_late_rate_pct", (0)::numeric) * 0.45) + (COALESCE("book"."booking_delay_rate_pct", (0)::numeric) * 0.20)) + (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) * 0.20)) + (COALESCE("qc"."avg_defect_rate_pct", (0)::numeric) * 0.15)), 2) AS "operational_risk_score",
        CASE
            WHEN ((COALESCE("prod"."production_late_rate_pct", (0)::numeric) >= (25)::numeric) OR (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) >= (20)::numeric) OR (COALESCE("qc"."avg_defect_rate_pct", (0)::numeric) >= (5)::numeric)) THEN 'HIGH'::"text"
            WHEN ((COALESCE("prod"."production_late_rate_pct", (0)::numeric) >= (10)::numeric) OR (COALESCE("qc"."qc_fail_rate_pct", (0)::numeric) >= (10)::numeric) OR (COALESCE("qc"."avg_defect_rate_pct", (0)::numeric) >= (2)::numeric)) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "operational_risk_level"
   FROM (((("op"
     CROSS JOIN "prod")
     CROSS JOIN "book")
     CROSS JOIN "qc")
     CROSS JOIN "coverage");


ALTER VIEW "public"."vw_exec_kpi_dashboard" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_model_operational_profile" AS
 SELECT "modelo_id",
    "style",
    "reference",
    "category",
    "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
        CASE
            WHEN (("sum"("sell_amount_real") >= (500000)::numeric) AND ("round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) >= (12)::numeric)) THEN 'STAR_MODEL'::"text"
            WHEN (("sum"("sell_amount_real") >= (250000)::numeric) AND ("round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) >= (10)::numeric)) THEN 'CORE_MODEL'::"text"
            WHEN ("round"(((("sum"(
            CASE
                WHEN ("production_late_flag" = true) THEN 1
                ELSE 0
            END))::numeric / (NULLIF("sum"(
            CASE
                WHEN ("production_late_flag" IS NOT NULL) THEN 1
                ELSE 0
            END), 0))::numeric) * (100)::numeric), 2) >= (25)::numeric) THEN 'RISK_MODEL'::"text"
            ELSE 'STANDARD_MODEL'::"text"
        END AS "model_profile"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "modelo_id", "style", "reference", "category", "season";


ALTER VIEW "public"."vw_model_operational_profile" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_model_ranking" AS
 SELECT "modelo_id",
    "style",
    "reference",
    "category",
    "season",
    "model_profile",
    "po_count",
    "line_count",
    "customer_count",
    "factory_count",
    "qty_total",
    "sell_amount_total",
    "buy_amount_total",
    "margin_bsg_total",
    "margin_xiamen_total",
    "contribution_total",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "lines_with_delay_basis",
    "late_lines",
    "avg_delay_production_days",
    "max_delay_production_days",
    "production_late_rate_pct",
    "rank"() OVER (ORDER BY "contribution_total" DESC NULLS LAST) AS "rank_contribution",
    "rank"() OVER (ORDER BY "sell_amount_total" DESC NULLS LAST) AS "rank_sales",
    "rank"() OVER (ORDER BY "production_late_rate_pct" DESC NULLS LAST) AS "rank_delay",
    "rank"() OVER (ORDER BY "contribution_pct" DESC NULLS LAST) AS "rank_profitability",
        CASE
            WHEN ("model_profile" = 'STAR_MODEL'::"text") THEN 'TOP'::"text"
            WHEN ("model_profile" = 'CORE_MODEL'::"text") THEN 'STRONG'::"text"
            WHEN ("model_profile" = 'RISK_MODEL'::"text") THEN 'WATCHLIST'::"text"
            ELSE 'STANDARD'::"text"
        END AS "executive_status"
   FROM "public"."vw_model_operational_profile";


ALTER VIEW "public"."vw_exec_model_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_narrative_v1" AS
 WITH "focus" AS (
         SELECT "vw_exec_intelligence_focus_v1"."customer",
            "vw_exec_intelligence_focus_v1"."alert_level",
            "vw_exec_intelligence_focus_v1"."alert_type",
            "vw_exec_intelligence_focus_v1"."alert_reason",
            "vw_exec_intelligence_focus_v1"."recommended_action",
            "vw_exec_intelligence_focus_v1"."alert_priority",
            "vw_exec_intelligence_focus_v1"."contextual_business_profile",
            "vw_exec_intelligence_focus_v1"."contextual_business_score",
            "vw_exec_intelligence_focus_v1"."customer_friction_score",
            "vw_exec_intelligence_focus_v1"."health_signal",
            "vw_exec_intelligence_focus_v1"."health_reason",
            "vw_exec_intelligence_focus_v1"."volume_signal",
            "vw_exec_intelligence_focus_v1"."qty_growth_pct",
            "vw_exec_intelligence_focus_v1"."sell_growth_pct",
            "vw_exec_intelligence_focus_v1"."xiamen_context_flag",
            "vw_exec_intelligence_focus_v1"."customer_size_band",
            "vw_exec_intelligence_focus_v1"."profitability_band",
            "vw_exec_intelligence_focus_v1"."contribution_pct",
            "vw_exec_intelligence_focus_v1"."xiamen_sales_mix_pct",
            "vw_exec_intelligence_focus_v1"."bsg_sales_mix_pct",
            "vw_exec_intelligence_focus_v1"."score_model",
            "vw_exec_intelligence_focus_v1"."health_priority",
            "vw_exec_intelligence_focus_v1"."source_module"
           FROM "public"."vw_exec_intelligence_focus_v1"
        ), "summary" AS (
         SELECT "count"(*) FILTER (WHERE ("focus"."alert_level" = 'CRITICAL'::"text")) AS "critical_count",
            "count"(*) FILTER (WHERE ("focus"."alert_level" = 'WARNING'::"text")) AS "warning_count",
            "count"(*) FILTER (WHERE ("focus"."alert_level" = 'MONITOR'::"text")) AS "monitor_count",
            "count"(*) FILTER (WHERE ("focus"."alert_level" = 'HEALTHY'::"text")) AS "healthy_count",
            "count"(*) AS "total_signals"
           FROM "focus"
        ), "top_critical" AS (
         SELECT "focus"."customer",
            "focus"."alert_reason",
            "focus"."recommended_action",
            "focus"."qty_growth_pct",
            "focus"."sell_growth_pct",
            "focus"."score_model"
           FROM "focus"
          WHERE ("focus"."alert_level" = 'CRITICAL'::"text")
          ORDER BY "focus"."contextual_business_score", "focus"."customer"
         LIMIT 1
        ), "top_growth" AS (
         SELECT "focus"."customer",
            "focus"."qty_growth_pct",
            "focus"."sell_growth_pct"
           FROM "focus"
          WHERE (("focus"."alert_level" = 'HEALTHY'::"text") AND ("focus"."score_model" = 'XIAMEN_VOLUME_BASED'::"text"))
          ORDER BY "focus"."sell_growth_pct" DESC NULLS LAST, "focus"."qty_growth_pct" DESC NULLS LAST
         LIMIT 1
        ), "bsg_warning" AS (
         SELECT "count"(*) AS "bsg_warning_count"
           FROM "focus"
          WHERE (("focus"."alert_level" = 'WARNING'::"text") AND ("focus"."score_model" = 'STANDARD_BUSINESS_MATRIX'::"text"))
        )
 SELECT 1 AS "narrative_order",
    'PORTFOLIO_STATUS'::"text" AS "narrative_code",
        CASE
            WHEN ("s"."critical_count" > 0) THEN 'CRITICAL'::"text"
            WHEN ("s"."warning_count" > 0) THEN 'WARNING'::"text"
            WHEN ("s"."monitor_count" > 0) THEN 'MONITOR'::"text"
            ELSE 'HEALTHY'::"text"
        END AS "narrative_level",
        CASE
            WHEN ("s"."critical_count" > 0) THEN (((('La cartera tiene '::"text" || "s"."critical_count") || ' cliente(s) en situaciÃ³n crÃ­tica y '::"text") || "s"."warning_count") || ' en warning.'::"text")
            WHEN ("s"."warning_count" > 0) THEN (('La cartera no tiene crÃ­ticos, pero mantiene '::"text" || "s"."warning_count") || ' cliente(s) en warning.'::"text")
            ELSE 'La cartera no muestra seÃ±ales crÃ­ticas relevantes en el contexto actual.'::"text"
        END AS "narrative_text",
    NULL::"text" AS "customer",
    NULL::"text" AS "recommended_action"
   FROM "summary" "s"
UNION ALL
 SELECT 2 AS "narrative_order",
    'TOP_CRITICAL'::"text" AS "narrative_code",
    'CRITICAL'::"text" AS "narrative_level",
    ((((('El foco principal es '::"text" || "top_critical"."customer") || ': '::"text") || "top_critical"."alert_reason") ||
        CASE
            WHEN ("top_critical"."qty_growth_pct" IS NOT NULL) THEN ((' CaÃ­da de volumen: '::"text" || "round"("top_critical"."qty_growth_pct", 1)) || '%.'::"text")
            ELSE ''::"text"
        END) ||
        CASE
            WHEN ("top_critical"."sell_growth_pct" IS NOT NULL) THEN ((' CaÃ­da de facturaciÃ³n: '::"text" || "round"("top_critical"."sell_growth_pct", 1)) || '%.'::"text")
            ELSE ''::"text"
        END) AS "narrative_text",
    "top_critical"."customer",
    "top_critical"."recommended_action"
   FROM "top_critical"
UNION ALL
 SELECT 3 AS "narrative_order",
    'BSG_WARNING_CLUSTER'::"text" AS "narrative_code",
    'WARNING'::"text" AS "narrative_level",
    (('Hay '::"text" || "bsg_warning"."bsg_warning_count") || ' cliente(s) BSG con fricciÃ³n elevada o perfil de riesgo comercial.'::"text") AS "narrative_text",
    NULL::"text" AS "customer",
    'Revisar clientes BSG en warning antes de nuevas campaÃ±as comerciales.'::"text" AS "recommended_action"
   FROM "bsg_warning"
  WHERE ("bsg_warning"."bsg_warning_count" > 0)
UNION ALL
 SELECT 4 AS "narrative_order",
    'XIAMEN_GROWTH_OPPORTUNITY'::"text" AS "narrative_code",
    'HEALTHY'::"text" AS "narrative_level",
    (('Oportunidad de crecimiento en Xiamen: '::"text" || "top_growth"."customer") ||
        CASE
            WHEN ("top_growth"."sell_growth_pct" IS NOT NULL) THEN ((' crece en facturaciÃ³n un '::"text" || "round"("top_growth"."sell_growth_pct", 1)) || '%.'::"text")
            WHEN ("top_growth"."qty_growth_pct" IS NOT NULL) THEN ((' crece en volumen un '::"text" || "round"("top_growth"."qty_growth_pct", 1)) || '%.'::"text")
            ELSE ' muestra evoluciÃ³n positiva.'::"text"
        END) AS "narrative_text",
    "top_growth"."customer",
    'Evaluar potencial comercial para la prÃ³xima temporada.'::"text" AS "recommended_action"
   FROM "top_growth"
  ORDER BY 1;


ALTER VIEW "public"."vw_exec_narrative_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_season_performance_ranking" AS
 WITH "base" AS (
         SELECT "vw_fact_operacion_timeline"."season",
            "count"(DISTINCT "vw_fact_operacion_timeline"."po_id") AS "po_count",
            "count"(*) AS "line_count",
            "count"(DISTINCT "vw_fact_operacion_timeline"."customer") AS "customer_count",
            "count"(DISTINCT "vw_fact_operacion_timeline"."factory") AS "factory_count",
            "count"(DISTINCT "vw_fact_operacion_timeline"."modelo_id") AS "model_count",
            "sum"("vw_fact_operacion_timeline"."qty_total") AS "qty_total",
            "round"("sum"("vw_fact_operacion_timeline"."sell_amount_real"), 2) AS "sell_amount_total",
            "round"("sum"("vw_fact_operacion_timeline"."contribution_amount"), 2) AS "contribution_total",
            "round"((("sum"("vw_fact_operacion_timeline"."contribution_amount") / NULLIF("sum"("vw_fact_operacion_timeline"."sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
            "count"(*) FILTER (WHERE "vw_fact_operacion_timeline"."has_production_delay_basis") AS "production_basis",
            "count"(*) FILTER (WHERE ("vw_fact_operacion_timeline"."production_late_flag" = true)) AS "production_late_lines",
            "round"("avg"("vw_fact_operacion_timeline"."delay_production_days"), 2) AS "avg_production_delay",
            "max"("vw_fact_operacion_timeline"."delay_production_days") AS "max_production_delay",
            "round"(((("sum"(
                CASE
                    WHEN "vw_fact_operacion_timeline"."production_late_flag" THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."production_late_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
            "count"(*) FILTER (WHERE "vw_fact_operacion_timeline"."has_booking_delay_basis") AS "booking_basis",
            "count"(*) FILTER (WHERE ("vw_fact_operacion_timeline"."booking_delay_flag" = true)) AS "booking_late_lines",
            "round"("avg"("vw_fact_operacion_timeline"."booking_delay_days"), 2) AS "avg_booking_delay",
            "max"("vw_fact_operacion_timeline"."booking_delay_days") AS "max_booking_delay",
            "round"(((("sum"(
                CASE
                    WHEN "vw_fact_operacion_timeline"."booking_delay_flag" THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("sum"(
                CASE
                    WHEN ("vw_fact_operacion_timeline"."booking_delay_flag" IS NOT NULL) THEN 1
                    ELSE 0
                END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct"
           FROM "public"."vw_fact_operacion_timeline"
          GROUP BY "vw_fact_operacion_timeline"."season"
        )
 SELECT "season",
    "po_count",
    "line_count",
    "customer_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
    "contribution_pct",
    "production_basis",
    "production_late_lines",
    "avg_production_delay",
    "max_production_delay",
    "production_late_rate_pct",
    "booking_basis",
    "booking_late_lines",
    "avg_booking_delay",
    "max_booking_delay",
    "booking_delay_rate_pct",
    "rank"() OVER (ORDER BY "contribution_total" DESC NULLS LAST) AS "rank_sales",
    "rank"() OVER (ORDER BY "contribution_pct" DESC NULLS LAST) AS "rank_profitability",
    "rank"() OVER (ORDER BY "production_late_rate_pct" DESC NULLS LAST) AS "rank_production_risk",
    "rank"() OVER (ORDER BY "booking_delay_rate_pct" DESC NULLS LAST) AS "rank_logistics_risk"
   FROM "base";


ALTER VIEW "public"."vw_exec_season_performance_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary" AS
 SELECT "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea";


ALTER VIEW "public"."vw_exec_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_etd_pi_month" AS
 SELECT ("date_trunc"('month'::"text", ("etd_pi")::timestamp with time zone))::"date" AS "month_date",
    (EXTRACT(year FROM "etd_pi"))::integer AS "anio",
    (EXTRACT(month FROM "etd_pi"))::integer AS "mes",
    "to_char"("date_trunc"('month'::"text", ("etd_pi")::timestamp with time zone), 'YYYY-MM'::"text") AS "year_month",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."vw_fact_operacion_timeline"
  WHERE ("etd_pi" IS NOT NULL)
  GROUP BY (("date_trunc"('month'::"text", ("etd_pi")::timestamp with time zone))::"date"), (EXTRACT(year FROM "etd_pi")), (EXTRACT(month FROM "etd_pi")), ("to_char"("date_trunc"('month'::"text", ("etd_pi")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."vw_exec_summary_by_etd_pi_month" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_finish_month" AS
 SELECT ("date_trunc"('month'::"text", ("finish_date")::timestamp with time zone))::"date" AS "month_date",
    (EXTRACT(year FROM "finish_date"))::integer AS "anio",
    (EXTRACT(month FROM "finish_date"))::integer AS "mes",
    "to_char"("date_trunc"('month'::"text", ("finish_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "year_month",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."vw_fact_operacion_timeline"
  WHERE ("finish_date" IS NOT NULL)
  GROUP BY (("date_trunc"('month'::"text", ("finish_date")::timestamp with time zone))::"date"), (EXTRACT(year FROM "finish_date")), (EXTRACT(month FROM "finish_date")), ("to_char"("date_trunc"('month'::"text", ("finish_date")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."vw_exec_summary_by_finish_month" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_po_month" AS
 SELECT ("date_trunc"('month'::"text", ("po_date")::timestamp with time zone))::"date" AS "month_date",
    (EXTRACT(year FROM "po_date"))::integer AS "anio",
    (EXTRACT(month FROM "po_date"))::integer AS "mes",
    "to_char"("date_trunc"('month'::"text", ("po_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "year_month",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct"
   FROM "public"."vw_fact_operacion_timeline"
  WHERE ("po_date" IS NOT NULL)
  GROUP BY (("date_trunc"('month'::"text", ("po_date")::timestamp with time zone))::"date"), (EXTRACT(year FROM "po_date")), (EXTRACT(month FROM "po_date")), ("to_char"("date_trunc"('month'::"text", ("po_date")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."vw_exec_summary_by_po_month" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_season" AS
 SELECT "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "count"(*) FILTER (WHERE "has_production_delay_basis") AS "lines_with_delay_basis",
    "count"(*) FILTER (WHERE ("production_late_flag" = true)) AS "late_lines",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "max"("delay_production_days") AS "max_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct",
    "count"(*) FILTER (WHERE "has_booking_delay_basis") AS "lines_with_booking_basis",
    "count"(*) FILTER (WHERE ("booking_delay_flag" = true)) AS "booking_late_lines",
    "round"("avg"("booking_delay_days"), 2) AS "avg_booking_delay_days",
    "max"("booking_delay_days") AS "max_booking_delay_days",
    "round"(((("sum"(
        CASE
            WHEN ("booking_delay_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct"
   FROM "public"."vw_fact_operacion_timeline"
  GROUP BY "season";


ALTER VIEW "public"."vw_exec_summary_by_season" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_season_v2" AS
 SELECT "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_bsg_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_margin_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "bsg_margin_pct"
   FROM "public"."mv_fact_operacion_linea_v2"
  WHERE ("season" IS NOT NULL)
  GROUP BY "season";


ALTER VIEW "public"."vw_exec_summary_by_season_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_by_shipping_month" AS
 SELECT ("date_trunc"('month'::"text", ("shipping_date")::timestamp with time zone))::"date" AS "month_date",
    (EXTRACT(year FROM "shipping_date"))::integer AS "anio",
    (EXTRACT(month FROM "shipping_date"))::integer AS "mes",
    "to_char"("date_trunc"('month'::"text", ("shipping_date")::timestamp with time zone), 'YYYY-MM'::"text") AS "year_month",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "count"(*) FILTER (WHERE "has_booking_delay_basis") AS "lines_with_booking_basis",
    "count"(*) FILTER (WHERE ("booking_delay_flag" = true)) AS "booking_late_lines",
    "round"("avg"("booking_delay_days"), 2) AS "avg_booking_delay_days",
    "max"("booking_delay_days") AS "max_booking_delay_days",
    "round"(((("sum"(
        CASE
            WHEN ("booking_delay_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("booking_delay_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "booking_delay_rate_pct"
   FROM "public"."vw_fact_operacion_timeline"
  WHERE ("shipping_date" IS NOT NULL)
  GROUP BY (("date_trunc"('month'::"text", ("shipping_date")::timestamp with time zone))::"date"), (EXTRACT(year FROM "shipping_date")), (EXTRACT(month FROM "shipping_date")), ("to_char"("date_trunc"('month'::"text", ("shipping_date")::timestamp with time zone), 'YYYY-MM'::"text"));


ALTER VIEW "public"."vw_exec_summary_by_shipping_month" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_filterable_v2" AS
 SELECT "season",
    "customer",
    "factory",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_bsg_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_margin_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "bsg_margin_pct"
   FROM "public"."mv_fact_operacion_linea_v2"
  GROUP BY "season", "customer", "factory";


ALTER VIEW "public"."vw_exec_summary_filterable_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_exec_summary_v2" AS
 SELECT "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_bsg_total",
    "round"("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END) / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "bsg_sales_mix_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'XIAMEN_DIC'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "xiamen_margin_pct",
    "round"((("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "contribution_amount"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("operativa_code" = 'BSG'::"text") THEN "sell_amount_real"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "bsg_margin_pct"
   FROM "public"."mv_fact_operacion_linea_v2";


ALTER VIEW "public"."vw_exec_summary_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_by_factory" AS
 SELECT "factory",
    "count"(*) AS "inspection_count",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"(COALESCE("qty_inspected", 0)) AS "qty_inspected_total",
    "round"("sum"(COALESCE("sell_amount_total", (0)::numeric)), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("contribution_total", (0)::numeric)), 2) AS "contribution_total",
    "sum"(COALESCE("total_defects_found", 0)) AS "total_defects_found",
    "sum"(COALESCE("critical_found", 0)) AS "critical_found",
    "sum"(COALESCE("major_found", 0)) AS "major_found",
    "sum"(COALESCE("minor_found", 0)) AS "minor_found",
    "round"("avg"("defect_rate_pct"), 2) AS "avg_defect_rate_pct",
    "max"("defect_rate_pct") AS "max_defect_rate_pct",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = true)) AS "passed_inspections",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = false)) AS "failed_inspections",
    "round"(((("sum"(
        CASE
            WHEN ("qc_pass_flag" = false) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("qc_pass_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "qc_fail_rate_pct",
    "count"(*) FILTER (WHERE ("has_critical_defect" = true)) AS "inspections_with_critical",
    "count"(*) FILTER (WHERE ("has_any_production_delay" = true)) AS "inspections_with_production_delay",
    "round"("avg"("avg_delay_production_days"), 2) AS "avg_delay_production_days"
   FROM "public"."vw_qc_operacion_bridge"
  GROUP BY "factory";


ALTER VIEW "public"."vw_qc_by_factory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_risk_ranking" AS
 SELECT "factory",
    "inspection_count",
    "po_count",
    "customer_count",
    "model_count",
    "qty_inspected_total",
    "sell_amount_total",
    "contribution_total",
    "total_defects_found",
    "critical_found",
    "major_found",
    "minor_found",
    "avg_defect_rate_pct",
    "max_defect_rate_pct",
    "qc_fail_rate_pct",
    "inspections_with_critical",
    "inspections_with_production_delay",
    "avg_delay_production_days",
    "round"(((((COALESCE("qc_fail_rate_pct", (0)::numeric) * 0.40) + (COALESCE("avg_defect_rate_pct", (0)::numeric) * 0.25)) + (COALESCE("avg_delay_production_days", (0)::numeric) * 0.20)) + ((((COALESCE("inspections_with_critical", (0)::bigint))::numeric / (NULLIF("inspection_count", 0))::numeric) * (100)::numeric) * 0.15)), 2) AS "qc_risk_score",
        CASE
            WHEN ("inspection_count" < 5) THEN 'LOW_SAMPLE'::"text"
            WHEN ((COALESCE("qc_fail_rate_pct", (0)::numeric) >= (25)::numeric) OR (COALESCE("avg_defect_rate_pct", (0)::numeric) >= (5)::numeric) OR (COALESCE("avg_delay_production_days", (0)::numeric) >= (5)::numeric)) THEN 'HIGH'::"text"
            WHEN ((COALESCE("qc_fail_rate_pct", (0)::numeric) >= (10)::numeric) OR (COALESCE("avg_defect_rate_pct", (0)::numeric) >= (2)::numeric) OR (COALESCE("avg_delay_production_days", (0)::numeric) >= (2)::numeric)) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "qc_risk_level",
    "rank"() OVER (ORDER BY ("round"(((((COALESCE("qc_fail_rate_pct", (0)::numeric) * 0.40) + (COALESCE("avg_defect_rate_pct", (0)::numeric) * 0.25)) + (COALESCE("avg_delay_production_days", (0)::numeric) * 0.20)) + ((((COALESCE("inspections_with_critical", (0)::bigint))::numeric / (NULLIF("inspection_count", 0))::numeric) * (100)::numeric) * 0.15)), 2)) DESC NULLS LAST) AS "qc_risk_rank"
   FROM "public"."vw_qc_by_factory";


ALTER VIEW "public"."vw_qc_risk_ranking" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_factory_quality_vs_delay" AS
 SELECT "fr"."factory",
    "fr"."risk_level" AS "production_risk_level",
    "fr"."risk_score" AS "production_risk_score",
    "fr"."lines_with_delay_basis",
    "fr"."late_lines",
    "fr"."production_late_rate_pct",
    "fr"."avg_delay_production_days",
    "fr"."max_delay_production_days",
    "qr"."inspection_count",
    "qr"."qc_fail_rate_pct",
    "qr"."avg_defect_rate_pct",
    "qr"."critical_found",
    "qr"."qc_risk_score",
    "qr"."qc_risk_level",
    "qr"."qc_risk_rank",
    "fr"."po_count",
    "fr"."customer_count",
    "fr"."model_count",
    "fr"."qty_total",
    "fr"."sell_amount_total",
    "fr"."contribution_total",
    "round"(((COALESCE("fr"."risk_score", (0)::numeric) * 0.55) + (COALESCE("qr"."qc_risk_score", (0)::numeric) * 0.45)), 2) AS "combined_factory_risk_score",
        CASE
            WHEN (("fr"."lines_with_delay_basis" < 10) AND (COALESCE("qr"."inspection_count", (0)::bigint) < 5)) THEN 'LOW_SAMPLE'::"text"
            WHEN ((COALESCE("fr"."risk_score", (0)::numeric) >= (25)::numeric) AND (COALESCE("qr"."qc_risk_score", (0)::numeric) >= (20)::numeric)) THEN 'CRITICAL'::"text"
            WHEN ((COALESCE("fr"."risk_score", (0)::numeric) >= (20)::numeric) OR (COALESCE("qr"."qc_risk_score", (0)::numeric) >= (18)::numeric)) THEN 'HIGH'::"text"
            WHEN ((COALESCE("fr"."risk_score", (0)::numeric) >= (10)::numeric) OR (COALESCE("qr"."qc_risk_score", (0)::numeric) >= (10)::numeric)) THEN 'MEDIUM'::"text"
            ELSE 'LOW'::"text"
        END AS "combined_risk_level"
   FROM ("public"."vw_factory_risk_score" "fr"
     LEFT JOIN "public"."vw_qc_risk_ranking" "qr" ON (("qr"."factory" = "fr"."factory")));


ALTER VIEW "public"."vw_factory_quality_vs_delay" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_margin_by_customer" AS
 SELECT "customer",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "customer";


ALTER VIEW "public"."vw_margin_by_customer" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_margin_by_factory" AS
 SELECT "factory",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "modelo_id") AS "model_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "factory";


ALTER VIEW "public"."vw_margin_by_factory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_margin_by_modelo" AS
 SELECT "modelo_id",
    "style",
    "reference",
    "category",
    "season",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "modelo_id", "style", "reference", "category", "season";


ALTER VIEW "public"."vw_margin_by_modelo" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_operativa_xiamen_vs_bsg" AS
 SELECT "operativa_code",
    "operativa_family",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(*) AS "line_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "sum"("qty_total") AS "qty_total",
    "round"("sum"("sell_amount_real"), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("buy_amount_real", (0)::numeric)), 2) AS "buy_amount_total",
    "round"("sum"("margin_base_amount"), 2) AS "margin_bsg_total",
    "round"("sum"("commission_amount"), 2) AS "margin_xiamen_total",
    "round"("sum"("contribution_amount"), 2) AS "contribution_total",
    "round"((("sum"("contribution_amount") / NULLIF("sum"("sell_amount_real"), (0)::numeric)) * (100)::numeric), 2) AS "contribution_pct",
    "round"("avg"("delay_production_days"), 2) AS "avg_delay_production_days",
    "round"(((("sum"(
        CASE
            WHEN ("production_late_flag" = true) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("production_late_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "production_late_rate_pct"
   FROM "public"."mv_fact_operacion_linea"
  GROUP BY "operativa_code", "operativa_family";


ALTER VIEW "public"."vw_operativa_xiamen_vs_bsg" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_qc_by_model" AS
 SELECT "modelo_id",
    "style",
    "reference",
    "category",
    "season",
    "count"(*) AS "inspection_count",
    "count"(DISTINCT "po_id") AS "po_count",
    "count"(DISTINCT "customer") AS "customer_count",
    "count"(DISTINCT "factory") AS "factory_count",
    "sum"(COALESCE("qty_inspected", 0)) AS "qty_inspected_total",
    "round"("sum"(COALESCE("sell_amount_total", (0)::numeric)), 2) AS "sell_amount_total",
    "round"("sum"(COALESCE("contribution_total", (0)::numeric)), 2) AS "contribution_total",
    "sum"(COALESCE("total_defects_found", 0)) AS "total_defects_found",
    "sum"(COALESCE("critical_found", 0)) AS "critical_found",
    "sum"(COALESCE("major_found", 0)) AS "major_found",
    "sum"(COALESCE("minor_found", 0)) AS "minor_found",
    "round"("avg"("defect_rate_pct"), 2) AS "avg_defect_rate_pct",
    "max"("defect_rate_pct") AS "max_defect_rate_pct",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = true)) AS "passed_inspections",
    "count"(*) FILTER (WHERE ("qc_pass_flag" = false)) AS "failed_inspections",
    "round"(((("sum"(
        CASE
            WHEN ("qc_pass_flag" = false) THEN 1
            ELSE 0
        END))::numeric / (NULLIF("sum"(
        CASE
            WHEN ("qc_pass_flag" IS NOT NULL) THEN 1
            ELSE 0
        END), 0))::numeric) * (100)::numeric), 2) AS "qc_fail_rate_pct",
    "count"(*) FILTER (WHERE ("has_critical_defect" = true)) AS "inspections_with_critical",
    "count"(*) FILTER (WHERE ("has_any_production_delay" = true)) AS "inspections_with_production_delay",
    "round"("avg"("avg_delay_production_days"), 2) AS "avg_delay_production_days"
   FROM "public"."vw_qc_operacion_bridge"
  GROUP BY "modelo_id", "style", "reference", "category", "season";


ALTER VIEW "public"."vw_qc_by_model" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_user_customer_scope" AS
 SELECT "p"."id" AS "user_id",
    "p"."email",
    "p"."full_name",
    "p"."role",
    "p"."is_active" AS "user_is_active",
    "a"."customer",
    "a"."is_active" AS "assignment_is_active"
   FROM ("public"."user_profiles" "p"
     LEFT JOIN "public"."user_customer_assignments" "a" ON ((("a"."user_id" = "p"."id") AND ("a"."is_active" = true))))
  WHERE ("p"."is_active" = true);


ALTER VIEW "public"."vw_user_customer_scope" OWNER TO "postgres";


ALTER TABLE ONLY "public"."dim_operativa" ALTER COLUMN "operativa_key" SET DEFAULT "nextval"('"public"."dim_operativa_operativa_key_seq"'::"regclass");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_muestra_id_unique" UNIQUE ("muestra_id");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_unicas" UNIQUE ("tipo", "subtipo", "po_id", "linea_pedido_id");



ALTER TABLE ONLY "public"."analytics_saved_analyses"
    ADD CONSTRAINT "analytics_saved_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_sync_status"
    ADD CONSTRAINT "analytics_sync_status_pkey" PRIMARY KEY ("sync_key");



ALTER TABLE ONLY "public"."aprobaciones"
    ADD CONSTRAINT "aprobaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalogos"
    ADD CONSTRAINT "catalogos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dim_fecha"
    ADD CONSTRAINT "dim_fecha_fecha_key" UNIQUE ("fecha");



ALTER TABLE ONLY "public"."dim_fecha"
    ADD CONSTRAINT "dim_fecha_pkey" PRIMARY KEY ("date_key");



ALTER TABLE ONLY "public"."dim_operativa"
    ADD CONSTRAINT "dim_operativa_operativa_code_key" UNIQUE ("operativa_code");



ALTER TABLE ONLY "public"."dim_operativa"
    ADD CONSTRAINT "dim_operativa_pkey" PRIMARY KEY ("operativa_key");



ALTER TABLE ONLY "public"."executive_action_decisions"
    ADD CONSTRAINT "executive_action_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."executive_action_notes"
    ADD CONSTRAINT "executive_action_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."executive_actions"
    ADD CONSTRAINT "executive_actions_action_key_key" UNIQUE ("action_key");



ALTER TABLE ONLY "public"."executive_actions"
    ADD CONSTRAINT "executive_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."importacion_entidades"
    ADD CONSTRAINT "importacion_entidades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."importaciones"
    ADD CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_componentes"
    ADD CONSTRAINT "modelo_componentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_eventos"
    ADD CONSTRAINT "modelo_eventos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_imagenes"
    ADD CONSTRAINT "modelo_imagenes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_precios"
    ADD CONSTRAINT "modelo_precios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_variantes"
    ADD CONSTRAINT "modelo_variantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelos"
    ADD CONSTRAINT "modelos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelos"
    ADD CONSTRAINT "modelos_style_key" UNIQUE ("style");



ALTER TABLE ONLY "public"."muestras"
    ADD CONSTRAINT "muestras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos"
    ADD CONSTRAINT "pos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos"
    ADD CONSTRAINT "pos_po_key" UNIQUE ("po");



ALTER TABLE ONLY "public"."production_active_seasons"
    ADD CONSTRAINT "production_active_seasons_pkey" PRIMARY KEY ("season");



ALTER TABLE ONLY "public"."qc_defect_action_logs"
    ADD CONSTRAINT "qc_defect_action_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_defect_photos"
    ADD CONSTRAINT "qc_defect_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_defects"
    ADD CONSTRAINT "qc_defects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_inspections"
    ADD CONSTRAINT "qc_inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_pps_photos"
    ADD CONSTRAINT "qc_pps_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modelo_variantes"
    ADD CONSTRAINT "uq_modelo_variantes_modelo_season_color_reference" UNIQUE ("modelo_id", "season", "color", "reference");



ALTER TABLE ONLY "public"."modelo_variantes"
    ADD CONSTRAINT "uq_modelo_variantes_modelo_season_color_referencekey" UNIQUE ("modelo_id", "season", "color", "reference_key");



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_unique" UNIQUE ("user_id", "customer");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."validaciones_muestra"
    ADD CONSTRAINT "validaciones_muestra_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "alertas_natural_key" ON "public"."alertas" USING "btree" ("po_id", COALESCE("linea_pedido_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "tipo", COALESCE("subtipo", ''::"text"));



CREATE INDEX "cotizaciones_created_at_idx" ON "public"."cotizaciones" USING "btree" ("created_at" DESC);



CREATE INDEX "cotizaciones_modelo_id_idx" ON "public"."cotizaciones" USING "btree" ("modelo_id");



CREATE INDEX "cotizaciones_variante_id_idx" ON "public"."cotizaciones" USING "btree" ("variante_id");



CREATE INDEX "idx_alertas_linea_pedido_id" ON "public"."alertas" USING "btree" ("linea_pedido_id");



CREATE INDEX "idx_alertas_muestra_id" ON "public"."alertas" USING "btree" ("muestra_id");



CREATE INDEX "idx_alertas_po_id" ON "public"."alertas" USING "btree" ("po_id");



CREATE INDEX "idx_alertas_tipo_fecha" ON "public"."alertas" USING "btree" ("tipo", "fecha" DESC);



CREATE INDEX "idx_catalogos_active" ON "public"."catalogos" USING "btree" ("active");



CREATE INDEX "idx_catalogos_category" ON "public"."catalogos" USING "btree" ("category");



CREATE INDEX "idx_catalogos_category_name" ON "public"."catalogos" USING "btree" ("category", "name");



CREATE INDEX "idx_dim_fecha_anio_mes" ON "public"."dim_fecha" USING "btree" ("anio", "mes");



CREATE INDEX "idx_dim_fecha_year_month" ON "public"."dim_fecha" USING "btree" ("year_month");



CREATE INDEX "idx_exec_action_decisions_action_id" ON "public"."executive_action_decisions" USING "btree" ("action_id");



CREATE INDEX "idx_exec_action_notes_action_id" ON "public"."executive_action_notes" USING "btree" ("action_id");



CREATE INDEX "idx_exec_actions_action_key" ON "public"."executive_actions" USING "btree" ("action_key");



CREATE INDEX "idx_exec_actions_created_at" ON "public"."executive_actions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_exec_actions_customer" ON "public"."executive_actions" USING "btree" ("customer");



CREATE INDEX "idx_exec_actions_last_seen_at" ON "public"."executive_actions" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_exec_actions_owner" ON "public"."executive_actions" USING "btree" ("owner_label");



CREATE INDEX "idx_exec_actions_priority" ON "public"."executive_actions" USING "btree" ("priority");



CREATE INDEX "idx_exec_actions_source_type" ON "public"."executive_actions" USING "btree" ("source_type");



CREATE INDEX "idx_exec_actions_status" ON "public"."executive_actions" USING "btree" ("status");



CREATE INDEX "idx_executive_actions_customer" ON "public"."executive_actions" USING "btree" ("customer");



CREATE INDEX "idx_executive_actions_priority" ON "public"."executive_actions" USING "btree" ("priority");



CREATE INDEX "idx_executive_actions_source" ON "public"."executive_actions" USING "btree" ("source_view", "source_type");



CREATE INDEX "idx_executive_actions_status" ON "public"."executive_actions" USING "btree" ("status");



CREATE INDEX "idx_importacion_entidades_importacion" ON "public"."importacion_entidades" USING "btree" ("importacion_id");



CREATE INDEX "idx_importacion_entidades_tabla_entidad" ON "public"."importacion_entidades" USING "btree" ("tabla", "entidad_id");



CREATE INDEX "idx_lineas_pedido_master_price_id_used" ON "public"."lineas_pedido" USING "btree" ("master_price_id_used");



CREATE INDEX "idx_lineas_pedido_modelo_id" ON "public"."lineas_pedido" USING "btree" ("modelo_id");



CREATE INDEX "idx_lineas_pedido_variante_id" ON "public"."lineas_pedido" USING "btree" ("variante_id");



CREATE INDEX "idx_modelo_componentes_catalogo" ON "public"."modelo_componentes" USING "btree" ("catalogo_id");



CREATE INDEX "idx_modelo_componentes_kind_slot" ON "public"."modelo_componentes" USING "btree" ("kind", "slot");



CREATE INDEX "idx_modelo_componentes_modelo" ON "public"."modelo_componentes" USING "btree" ("modelo_id");



CREATE INDEX "idx_modelo_componentes_variante" ON "public"."modelo_componentes" USING "btree" ("variante_id");



CREATE INDEX "idx_modelo_eventos_created_at" ON "public"."modelo_eventos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_modelo_eventos_entity_type" ON "public"."modelo_eventos" USING "btree" ("entity_type");



CREATE INDEX "idx_modelo_eventos_event_type" ON "public"."modelo_eventos" USING "btree" ("event_type");



CREATE INDEX "idx_modelo_eventos_modelo" ON "public"."modelo_eventos" USING "btree" ("modelo_id");



CREATE INDEX "idx_modelo_eventos_season" ON "public"."modelo_eventos" USING "btree" ("season");



CREATE INDEX "idx_modelo_eventos_variante" ON "public"."modelo_eventos" USING "btree" ("variante_id");



CREATE INDEX "idx_modelo_imagenes_kind" ON "public"."modelo_imagenes" USING "btree" ("kind");



CREATE INDEX "idx_modelo_imagenes_modelo" ON "public"."modelo_imagenes" USING "btree" ("modelo_id");



CREATE INDEX "idx_modelo_imagenes_variante" ON "public"."modelo_imagenes" USING "btree" ("variante_id");



CREATE INDEX "idx_modelo_precios_modelo" ON "public"."modelo_precios" USING "btree" ("modelo_id");



CREATE INDEX "idx_modelo_precios_modelo_season" ON "public"."modelo_precios" USING "btree" ("modelo_id", "season");



CREATE INDEX "idx_modelo_precios_season" ON "public"."modelo_precios" USING "btree" ("season");



CREATE INDEX "idx_modelo_precios_valid_from" ON "public"."modelo_precios" USING "btree" ("valid_from");



CREATE INDEX "idx_modelo_precios_variante" ON "public"."modelo_precios" USING "btree" ("variante_id");



CREATE INDEX "idx_modelo_variantes_color" ON "public"."modelo_variantes" USING "btree" ("color");



CREATE INDEX "idx_modelo_variantes_modelo" ON "public"."modelo_variantes" USING "btree" ("modelo_id");



CREATE INDEX "idx_modelo_variantes_season" ON "public"."modelo_variantes" USING "btree" ("season");



CREATE INDEX "idx_modelos_customer" ON "public"."modelos" USING "btree" ("customer");



CREATE INDEX "idx_modelos_factory" ON "public"."modelos" USING "btree" ("factory");



CREATE INDEX "idx_modelos_status" ON "public"."modelos" USING "btree" ("status");



CREATE INDEX "idx_modelos_supplier" ON "public"."modelos" USING "btree" ("supplier");



CREATE INDEX "idx_mv_exec_cross_module_correlations_fast_customer" ON "public"."mv_exec_cross_module_correlations_fast" USING "btree" ("customer");



CREATE INDEX "idx_mv_exec_cross_module_correlations_fast_score" ON "public"."mv_exec_cross_module_correlations_fast" USING "btree" ("correlation_score" DESC);



CREATE INDEX "idx_mv_exec_cross_module_correlations_fast_severity" ON "public"."mv_exec_cross_module_correlations_fast" USING "btree" ("severity");



CREATE INDEX "idx_mv_exec_cross_module_risk_fast_customer" ON "public"."mv_exec_cross_module_risk_fast" USING "btree" ("customer");



CREATE INDEX "idx_mv_exec_cross_module_risk_fast_level" ON "public"."mv_exec_cross_module_risk_fast" USING "btree" ("cross_module_risk_level");



CREATE INDEX "idx_mv_exec_cross_module_risk_fast_score" ON "public"."mv_exec_cross_module_risk_fast" USING "btree" ("cross_module_risk_score" DESC);



CREATE INDEX "idx_mv_exec_morning_brief_fast_generated_at" ON "public"."mv_exec_morning_brief_fast" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_mv_fact_operacion_customer" ON "public"."mv_fact_operacion_linea" USING "btree" ("customer");



CREATE INDEX "idx_mv_fact_operacion_delay" ON "public"."mv_fact_operacion_linea" USING "btree" ("production_late_flag", "delay_production_days");



CREATE INDEX "idx_mv_fact_operacion_etd_pi" ON "public"."mv_fact_operacion_linea" USING "btree" ("etd_pi");



CREATE INDEX "idx_mv_fact_operacion_factory" ON "public"."mv_fact_operacion_linea" USING "btree" ("factory");



CREATE INDEX "idx_mv_fact_operacion_finish_date" ON "public"."mv_fact_operacion_linea" USING "btree" ("finish_date");



CREATE UNIQUE INDEX "idx_mv_fact_operacion_linea_pk" ON "public"."mv_fact_operacion_linea" USING "btree" ("linea_pedido_id");



CREATE INDEX "idx_mv_fact_operacion_modelo" ON "public"."mv_fact_operacion_linea" USING "btree" ("modelo_id");



CREATE INDEX "idx_mv_fact_operacion_operativa" ON "public"."mv_fact_operacion_linea" USING "btree" ("operativa_code");



CREATE INDEX "idx_mv_fact_operacion_po_date" ON "public"."mv_fact_operacion_linea" USING "btree" ("po_date");



CREATE INDEX "idx_mv_fact_operacion_season" ON "public"."mv_fact_operacion_linea" USING "btree" ("season");



CREATE INDEX "idx_mv_fact_operacion_supplier" ON "public"."mv_fact_operacion_linea" USING "btree" ("supplier");



CREATE INDEX "idx_mv_fact_operacion_variante" ON "public"."mv_fact_operacion_linea" USING "btree" ("variante_id");



CREATE UNIQUE INDEX "qc_inspections_report_number_unique" ON "public"."qc_inspections" USING "btree" ("report_number");



CREATE UNIQUE INDEX "uq_catalogos_category_name" ON "public"."catalogos" USING "btree" ("category", "name");



CREATE UNIQUE INDEX "uq_modelo_componentes_base" ON "public"."modelo_componentes" USING "btree" ("modelo_id", "kind", "slot") WHERE ("variante_id" IS NULL);



CREATE UNIQUE INDEX "uq_modelo_componentes_modelo_kind_slot_base" ON "public"."modelo_componentes" USING "btree" ("modelo_id", "kind", "slot") WHERE ("variante_id" IS NULL);



CREATE UNIQUE INDEX "uq_modelo_componentes_variante" ON "public"."modelo_componentes" USING "btree" ("variante_id", "kind", "slot") WHERE ("variante_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_modelo_componentes_variante_kind_slot" ON "public"."modelo_componentes" USING "btree" ("variante_id", "kind", "slot") WHERE ("variante_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_modelo_imagenes_main" ON "public"."modelo_imagenes" USING "btree" ("modelo_id") WHERE ("kind" = 'main'::"text");



CREATE UNIQUE INDEX "uq_modelo_precios_modelo_season_valid_from_base" ON "public"."modelo_precios" USING "btree" ("modelo_id", "season", "valid_from") WHERE ("variante_id" IS NULL);



CREATE UNIQUE INDEX "uq_modelo_precios_variante_scope_valid_from" ON "public"."modelo_precios" USING "btree" ("variante_id", "season", "valid_from", "category", "size_run", "channel") WHERE ("variante_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_alertas_updated_at" BEFORE UPDATE ON "public"."alertas" FOR EACH ROW EXECUTE FUNCTION "public"."update_alertas_updated_at"();



CREATE OR REPLACE TRIGGER "trg_executive_actions_updated_at" BEFORE UPDATE ON "public"."executive_actions" FOR EACH ROW EXECUTE FUNCTION "public"."set_executive_actions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_modelo_precios_updated_at" BEFORE UPDATE ON "public"."modelo_precios" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_modelo_variantes_updated_at" BEFORE UPDATE ON "public"."modelo_variantes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_modelos_updated_at" BEFORE UPDATE ON "public"."modelos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_customer_assignments_updated_at" BEFORE UPDATE ON "public"."user_customer_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_aprobaciones_updated_at" BEFORE UPDATE ON "public"."aprobaciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lineas_pedido_updated_at" BEFORE UPDATE ON "public"."lineas_pedido" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_muestras_updated_at" BEFORE UPDATE ON "public"."muestras" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pos_updated_at" BEFORE UPDATE ON "public"."pos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_validaciones_muestra_updated_at" BEFORE UPDATE ON "public"."validaciones_muestra" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_linea_pedido_id_fkey" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_muestra_id_fkey" FOREIGN KEY ("muestra_id") REFERENCES "public"."muestras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."pos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."aprobaciones"
    ADD CONSTRAINT "aprobaciones_muestra_id_fkey" FOREIGN KEY ("muestra_id") REFERENCES "public"."muestras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "cotizaciones_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cotizaciones"
    ADD CONSTRAINT "cotizaciones_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."executive_action_decisions"
    ADD CONSTRAINT "executive_action_decisions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."executive_actions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."executive_action_decisions"
    ADD CONSTRAINT "executive_action_decisions_decision_by_fkey" FOREIGN KEY ("decision_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."executive_action_notes"
    ADD CONSTRAINT "executive_action_notes_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."executive_actions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."executive_action_notes"
    ADD CONSTRAINT "executive_action_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."executive_actions"
    ADD CONSTRAINT "executive_actions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."importacion_entidades"
    ADD CONSTRAINT "importacion_entidades_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones"("id");



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_master_price_id_used_fkey" FOREIGN KEY ("master_price_id_used") REFERENCES "public"."modelo_precios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."pos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lineas_pedido"
    ADD CONSTRAINT "lineas_pedido_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modelo_componentes"
    ADD CONSTRAINT "modelo_componentes_catalogo_id_fkey" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modelo_componentes"
    ADD CONSTRAINT "modelo_componentes_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_componentes"
    ADD CONSTRAINT "modelo_componentes_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_eventos"
    ADD CONSTRAINT "modelo_eventos_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_eventos"
    ADD CONSTRAINT "modelo_eventos_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_imagenes"
    ADD CONSTRAINT "modelo_imagenes_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_imagenes"
    ADD CONSTRAINT "modelo_imagenes_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_precios"
    ADD CONSTRAINT "modelo_precios_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_precios"
    ADD CONSTRAINT "modelo_precios_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."modelo_variantes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modelo_variantes"
    ADD CONSTRAINT "modelo_variantes_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."muestras"
    ADD CONSTRAINT "muestras_linea_pedido_id_fkey" FOREIGN KEY ("linea_pedido_id") REFERENCES "public"."lineas_pedido"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pos"
    ADD CONSTRAINT "pos_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones"("id");



ALTER TABLE ONLY "public"."qc_defect_action_logs"
    ADD CONSTRAINT "qc_defect_action_logs_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "public"."qc_defects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_defect_photos"
    ADD CONSTRAINT "qc_defect_photos_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "public"."qc_defects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_defects"
    ADD CONSTRAINT "qc_defects_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "public"."qc_inspections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_inspections"
    ADD CONSTRAINT "qc_inspections_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."pos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_pps_photos"
    ADD CONSTRAINT "qc_pps_photos_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."pos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customer_assignments"
    ADD CONSTRAINT "user_customer_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."validaciones_muestra"
    ADD CONSTRAINT "validaciones_muestra_muestra_id_fkey" FOREIGN KEY ("muestra_id") REFERENCES "public"."muestras"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can read active seasons" ON "public"."production_active_seasons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."aprobaciones" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."lineas_pedido" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."muestras" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."pos" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."validaciones_muestra" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert access for all users" ON "public"."importaciones" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."importaciones" FOR SELECT USING (true);



CREATE POLICY "No client access importacion_entidades" ON "public"."importacion_entidades" USING (false) WITH CHECK (false);



CREATE POLICY "Permitir todo en lineas_pedido" ON "public"."lineas_pedido" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir todo en muestras" ON "public"."muestras" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir todo en pos" ON "public"."pos" USING (true) WITH CHECK (true);



ALTER TABLE "public"."analytics_saved_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_saved_analyses_delete" ON "public"."analytics_saved_analyses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."is_active" = true) AND ("user_profiles"."role" = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text", 'VIEWER'::"text"]))))));



CREATE POLICY "analytics_saved_analyses_insert" ON "public"."analytics_saved_analyses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."is_active" = true) AND ("user_profiles"."role" = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text", 'VIEWER'::"text"]))))));



CREATE POLICY "analytics_saved_analyses_select" ON "public"."analytics_saved_analyses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."is_active" = true) AND ("user_profiles"."role" = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text", 'VIEWER'::"text"]))))));



ALTER TABLE "public"."analytics_sync_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."aprobaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignments_admin_delete" ON "public"."user_customer_assignments" FOR DELETE TO "authenticated" USING ("public"."current_user_is_admin"());



CREATE POLICY "assignments_admin_insert" ON "public"."user_customer_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."current_user_is_admin"());



CREATE POLICY "assignments_admin_update" ON "public"."user_customer_assignments" FOR UPDATE TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());



CREATE POLICY "assignments_select_self_or_manager" ON "public"."user_customer_assignments" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text"]))));



ALTER TABLE "public"."executive_action_decisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "executive_action_decisions_all_authenticated" ON "public"."executive_action_decisions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."executive_action_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "executive_action_notes_all_authenticated" ON "public"."executive_action_notes" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."executive_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "executive_actions_insert_authenticated" ON "public"."executive_actions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "executive_actions_select_authenticated" ON "public"."executive_actions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "executive_actions_update_authenticated" ON "public"."executive_actions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."importacion_entidades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_active_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_customer_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_admin_delete" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ("public"."current_user_is_admin"());



CREATE POLICY "user_profiles_admin_insert" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."current_user_is_admin"());



CREATE POLICY "user_profiles_admin_update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());



CREATE POLICY "user_profiles_select_self_or_admin" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."current_user_role"() = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text"]))));



ALTER TABLE "public"."validaciones_muestra" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."activate_model_season_from_existing_season"("p_modelo_id" "uuid", "p_source_season" "text", "p_target_season" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."activate_model_season_from_existing_season"("p_modelo_id" "uuid", "p_source_season" "text", "p_target_season" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_model_season_from_existing_season"("p_modelo_id" "uuid", "p_source_season" "text", "p_target_season" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."actualizar_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_master_snapshot_for_line"("p_linea_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_master_snapshot_for_line"("p_linea_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_master_snapshot_for_line"("p_linea_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_can_see_all_customers"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_can_see_all_customers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_can_see_all_customers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_alertas"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_alertas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_alertas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_intelligence_focus_v1"("p_season" "text", "p_customer" "text", "p_factory" "text", "p_alert_level" "text", "p_source_module" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_narrative_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_narrative_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_narrative_season_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_narrative_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_narrative_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_narrative_v1"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_summary_context_v2"("p_seasons" "text"[], "p_include_all" boolean, "p_customer" "text", "p_factory" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_summary_context_v2"("p_seasons" "text"[], "p_include_all" boolean, "p_customer" "text", "p_factory" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_summary_context_v2"("p_seasons" "text"[], "p_include_all" boolean, "p_customer" "text", "p_factory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_summary_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_summary_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_summary_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exec_summary_with_delta_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exec_summary_with_delta_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exec_summary_with_delta_v2"("p_season" "text", "p_customer" "text", "p_factory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_bsg_margin_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_bsg_margin_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_bsg_margin_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_contribution_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_contribution_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_contribution_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_models_v1"("p_customer" "text", "p_season" "text", "p_metric" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_models_v1"("p_customer" "text", "p_season" "text", "p_metric" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_models_v1"("p_customer" "text", "p_season" "text", "p_metric" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_profitability_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_profitability_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_profitability_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_purchases_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_purchases_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_purchases_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_sales_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_sales_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_sales_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_sales_evolution_v1"("p_customer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_sales_evolution_v1"("p_customer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_sales_evolution_v1"("p_customer" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_explorer_xiamen_commission_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_explorer_xiamen_commission_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_explorer_xiamen_commission_by_customer_v1"("p_seasons" "text"[], "p_comparison_seasons" "text"[], "p_include_all" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_situation_pivot"("p_metric" "text", "p_dimension" "text", "p_season" "text", "p_customer" "text", "p_factory" "text", "p_operativa" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_situation_pivot"("p_metric" "text", "p_dimension" "text", "p_season" "text", "p_customer" "text", "p_factory" "text", "p_operativa" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_situation_pivot"("p_metric" "text", "p_dimension" "text", "p_season" "text", "p_customer" "text", "p_factory" "text", "p_operativa" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_situation_pivot_v2"("p_metric" "text", "p_dimension" "text", "p_seasons" "text"[], "p_customers" "text"[], "p_factories" "text"[], "p_operativas" "text"[], "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_situation_pivot_v2"("p_metric" "text", "p_dimension" "text", "p_seasons" "text"[], "p_customers" "text"[], "p_factories" "text"[], "p_operativas" "text"[], "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_situation_pivot_v2"("p_metric" "text", "p_dimension" "text", "p_seasons" "text"[], "p_customers" "text"[], "p_factories" "text"[], "p_operativas" "text"[], "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."obtener_pos_con_alertas_pendientes"() TO "anon";
GRANT ALL ON FUNCTION "public"."obtener_pos_con_alertas_pendientes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."obtener_pos_con_alertas_pendientes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_analytics_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_analytics_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_analytics_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_analytics_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_analytics_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_analytics_refresh"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_master_sync_pipeline"("p_mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."run_master_sync_pipeline"("p_mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_master_sync_pipeline"("p_mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_executive_actions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_executive_actions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_executive_actions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_analytics_v2"("p_source" "text", "p_requested_by" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_analytics_v2"("p_source" "text", "p_requested_by" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_exec_actions_from_risk"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_exec_actions_from_risk"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_exec_actions_from_risk"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_executive_action_from_signal"("p_action_key" "text", "p_source_view" "text", "p_source_type" "text", "p_source_entity_type" "text", "p_source_entity_id" "text", "p_customer" "text", "p_factory" "text", "p_season" "text", "p_module" "text", "p_priority" "public"."executive_action_priority", "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_executive_action_from_signal"("p_action_key" "text", "p_source_view" "text", "p_source_type" "text", "p_source_entity_type" "text", "p_source_entity_id" "text", "p_customer" "text", "p_factory" "text", "p_season" "text", "p_module" "text", "p_priority" "public"."executive_action_priority", "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_executive_action_from_signal"("p_action_key" "text", "p_source_view" "text", "p_source_type" "text", "p_source_entity_type" "text", "p_source_entity_id" "text", "p_customer" "text", "p_factory" "text", "p_season" "text", "p_module" "text", "p_priority" "public"."executive_action_priority", "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."truncate_alertas"() TO "anon";
GRANT ALL ON FUNCTION "public"."truncate_alertas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."truncate_alertas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_alertas_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_alertas_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_alertas_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."alertas" TO "anon";
GRANT ALL ON TABLE "public"."alertas" TO "authenticated";
GRANT ALL ON TABLE "public"."alertas" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_saved_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_saved_analyses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analytics_saved_analyses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analytics_saved_analyses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analytics_saved_analyses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_sync_status" TO "service_role";



GRANT ALL ON TABLE "public"."aprobaciones" TO "anon";
GRANT ALL ON TABLE "public"."aprobaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."aprobaciones" TO "service_role";



GRANT ALL ON TABLE "public"."catalogos" TO "anon";
GRANT ALL ON TABLE "public"."catalogos" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogos" TO "service_role";



GRANT ALL ON TABLE "public"."cotizaciones" TO "anon";
GRANT ALL ON TABLE "public"."cotizaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."cotizaciones" TO "service_role";



GRANT ALL ON TABLE "public"."dim_fecha" TO "anon";
GRANT ALL ON TABLE "public"."dim_fecha" TO "authenticated";
GRANT ALL ON TABLE "public"."dim_fecha" TO "service_role";



GRANT ALL ON TABLE "public"."dim_operativa" TO "anon";
GRANT ALL ON TABLE "public"."dim_operativa" TO "authenticated";
GRANT ALL ON TABLE "public"."dim_operativa" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dim_operativa_operativa_key_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dim_operativa_operativa_key_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dim_operativa_operativa_key_seq" TO "service_role";



GRANT ALL ON TABLE "public"."executive_action_decisions" TO "anon";
GRANT ALL ON TABLE "public"."executive_action_decisions" TO "authenticated";
GRANT ALL ON TABLE "public"."executive_action_decisions" TO "service_role";



GRANT ALL ON TABLE "public"."executive_action_notes" TO "anon";
GRANT ALL ON TABLE "public"."executive_action_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."executive_action_notes" TO "service_role";



GRANT ALL ON TABLE "public"."executive_actions" TO "anon";
GRANT ALL ON TABLE "public"."executive_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."executive_actions" TO "service_role";



GRANT ALL ON TABLE "public"."importacion_entidades" TO "anon";
GRANT ALL ON TABLE "public"."importacion_entidades" TO "authenticated";
GRANT ALL ON TABLE "public"."importacion_entidades" TO "service_role";



GRANT ALL ON TABLE "public"."importaciones" TO "anon";
GRANT ALL ON TABLE "public"."importaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."importaciones" TO "service_role";



GRANT ALL ON TABLE "public"."lineas_pedido" TO "anon";
GRANT ALL ON TABLE "public"."lineas_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."lineas_pedido" TO "service_role";



GRANT ALL ON TABLE "public"."modelo_componentes" TO "anon";
GRANT ALL ON TABLE "public"."modelo_componentes" TO "authenticated";
GRANT ALL ON TABLE "public"."modelo_componentes" TO "service_role";



GRANT ALL ON TABLE "public"."modelo_eventos" TO "anon";
GRANT ALL ON TABLE "public"."modelo_eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."modelo_eventos" TO "service_role";



GRANT ALL ON TABLE "public"."modelo_imagenes" TO "anon";
GRANT ALL ON TABLE "public"."modelo_imagenes" TO "authenticated";
GRANT ALL ON TABLE "public"."modelo_imagenes" TO "service_role";



GRANT ALL ON TABLE "public"."modelo_precios" TO "anon";
GRANT ALL ON TABLE "public"."modelo_precios" TO "authenticated";
GRANT ALL ON TABLE "public"."modelo_precios" TO "service_role";



GRANT ALL ON TABLE "public"."modelo_variantes" TO "anon";
GRANT ALL ON TABLE "public"."modelo_variantes" TO "authenticated";
GRANT ALL ON TABLE "public"."modelo_variantes" TO "service_role";



GRANT ALL ON TABLE "public"."modelos" TO "anon";
GRANT ALL ON TABLE "public"."modelos" TO "authenticated";
GRANT ALL ON TABLE "public"."modelos" TO "service_role";



GRANT ALL ON TABLE "public"."muestras" TO "anon";
GRANT ALL ON TABLE "public"."muestras" TO "authenticated";
GRANT ALL ON TABLE "public"."muestras" TO "service_role";



GRANT ALL ON TABLE "public"."pos" TO "anon";
GRANT ALL ON TABLE "public"."pos" TO "authenticated";
GRANT ALL ON TABLE "public"."pos" TO "service_role";



GRANT ALL ON TABLE "public"."mv_fact_operacion_linea" TO "anon";
GRANT ALL ON TABLE "public"."mv_fact_operacion_linea" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_fact_operacion_linea" TO "service_role";



GRANT ALL ON TABLE "public"."qc_defects" TO "anon";
GRANT ALL ON TABLE "public"."qc_defects" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_defects" TO "service_role";



GRANT ALL ON TABLE "public"."qc_inspections" TO "anon";
GRANT ALL ON TABLE "public"."qc_inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_inspections" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_profitability_profile" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_profitability_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_profitability_profile" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_quote_fact" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_quote_fact" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_quote_fact" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_quote_vs_order" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_quote_vs_order" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_quote_vs_order" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_conversion_by_customer" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_conversion_by_customer" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_conversion_by_customer" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_customer_negotiation_score" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_customer_negotiation_score" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_customer_negotiation_score" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_customer_price_pressure" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_customer_price_pressure" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_customer_price_pressure" TO "service_role";



GRANT ALL ON TABLE "public"."vw_fact_operacion_timeline" TO "anon";
GRANT ALL ON TABLE "public"."vw_fact_operacion_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_fact_operacion_timeline" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_customer_logistics_pressure_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_customer_logistics_pressure_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_customer_logistics_pressure_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_defect_summary" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_defect_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_defect_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_inspection_summary" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_inspection_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_inspection_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_operacion_bridge" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_operacion_bridge" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_operacion_bridge" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_by_customer" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_by_customer" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_by_customer" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_business_matrix" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_business_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_business_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_customer_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_customer_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_customer_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_xiamen_customer_season_volume_evolution" TO "anon";
GRANT ALL ON TABLE "public"."vw_xiamen_customer_season_volume_evolution" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_xiamen_customer_season_volume_evolution" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_health_signal" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_health_signal" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_health_signal" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_business_contextual" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_business_contextual" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_business_contextual" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_commercial_alerts" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_commercial_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_commercial_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_intelligence_signals_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_intelligence_signals_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_intelligence_signals_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_intelligence_focus_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_intelligence_focus_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_intelligence_focus_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v3" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v3" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v3" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_cross_module_correlations_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_correlations_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_correlations_v1" TO "service_role";



GRANT ALL ON TABLE "public"."mv_exec_cross_module_correlations_fast" TO "anon";
GRANT ALL ON TABLE "public"."mv_exec_cross_module_correlations_fast" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_exec_cross_module_correlations_fast" TO "service_role";



GRANT ALL ON TABLE "public"."mv_exec_cross_module_risk_fast" TO "anon";
GRANT ALL ON TABLE "public"."mv_exec_cross_module_risk_fast" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_exec_cross_module_risk_fast" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_action_lifecycle_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_action_lifecycle_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_action_lifecycle_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_resolution_analytics_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_resolution_analytics_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_resolution_analytics_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_resolution_kpis_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_resolution_kpis_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_resolution_kpis_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_morning_brief_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_morning_brief_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_morning_brief_v1" TO "service_role";



GRANT ALL ON TABLE "public"."mv_exec_morning_brief_fast" TO "anon";
GRANT ALL ON TABLE "public"."mv_exec_morning_brief_fast" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_exec_morning_brief_fast" TO "service_role";



GRANT ALL ON TABLE "public"."mv_fact_operacion_linea_v2" TO "anon";
GRANT ALL ON TABLE "public"."mv_fact_operacion_linea_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_fact_operacion_linea_v2" TO "service_role";



GRANT ALL ON TABLE "public"."production_active_seasons" TO "anon";
GRANT ALL ON TABLE "public"."production_active_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."production_active_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."qc_defect_action_logs" TO "anon";
GRANT ALL ON TABLE "public"."qc_defect_action_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_defect_action_logs" TO "service_role";



GRANT ALL ON TABLE "public"."qc_defect_photos" TO "anon";
GRANT ALL ON TABLE "public"."qc_defect_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_defect_photos" TO "service_role";



GRANT ALL ON TABLE "public"."qc_pps_photos" TO "anon";
GRANT ALL ON TABLE "public"."qc_pps_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_pps_photos" TO "service_role";



GRANT ALL ON TABLE "public"."user_customer_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_customer_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_customer_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."v_alertas_candidatas" TO "anon";
GRANT ALL ON TABLE "public"."v_alertas_candidatas" TO "authenticated";
GRANT ALL ON TABLE "public"."v_alertas_candidatas" TO "service_role";



GRANT ALL ON TABLE "public"."validaciones_muestra" TO "anon";
GRANT ALL ON TABLE "public"."validaciones_muestra" TO "authenticated";
GRANT ALL ON TABLE "public"."validaciones_muestra" TO "service_role";



GRANT ALL ON TABLE "public"."vw_commercial_seasons_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_commercial_seasons_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_commercial_seasons_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_campaign_board_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_campaign_board_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_campaign_board_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_events_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_daily_alert_summary_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_daily_alerts" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_daily_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_daily_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_qc_trial_bridge_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_customer_timeline_pressure" TO "anon";
GRANT ALL ON TABLE "public"."vw_customer_timeline_pressure" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_customer_timeline_pressure" TO "service_role";



GRANT ALL ON TABLE "public"."vw_delay_by_customer" TO "anon";
GRANT ALL ON TABLE "public"."vw_delay_by_customer" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_delay_by_customer" TO "service_role";



GRANT ALL ON TABLE "public"."vw_delay_by_factory" TO "anon";
GRANT ALL ON TABLE "public"."vw_delay_by_factory" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_delay_by_factory" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_exec_customer_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_exec_customer_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_exec_customer_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_exec_summary" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_exec_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_exec_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_model_price_dispersion" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_model_price_dispersion" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_model_price_dispersion" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_price_evolution" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_price_evolution" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_price_evolution" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_pricing_instability_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_pricing_instability_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_pricing_instability_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_dev_quote_vs_master" TO "anon";
GRANT ALL ON TABLE "public"."vw_dev_quote_vs_master" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_dev_quote_vs_master" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_action_queue_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_action_queue_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_action_queue_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_cross_module_risk_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_daily_brief_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_daily_brief_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_daily_brief_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_factory_risk_score" TO "anon";
GRANT ALL ON TABLE "public"."vw_factory_risk_score" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_factory_risk_score" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_factory_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_factory_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_factory_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_kpi_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_kpi_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_kpi_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."vw_model_operational_profile" TO "anon";
GRANT ALL ON TABLE "public"."vw_model_operational_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_model_operational_profile" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_model_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_model_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_model_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_narrative_v1" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_narrative_v1" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_narrative_v1" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_season_performance_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_season_performance_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_season_performance_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_etd_pi_month" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_etd_pi_month" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_etd_pi_month" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_finish_month" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_finish_month" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_finish_month" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_po_month" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_po_month" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_po_month" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_season" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_season" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_season" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_season_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_season_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_season_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_by_shipping_month" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_shipping_month" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_by_shipping_month" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_filterable_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_filterable_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_filterable_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_exec_summary_v2" TO "anon";
GRANT ALL ON TABLE "public"."vw_exec_summary_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_exec_summary_v2" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_by_factory" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_by_factory" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_by_factory" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_risk_ranking" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_risk_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_risk_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."vw_factory_quality_vs_delay" TO "anon";
GRANT ALL ON TABLE "public"."vw_factory_quality_vs_delay" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_factory_quality_vs_delay" TO "service_role";



GRANT ALL ON TABLE "public"."vw_margin_by_customer" TO "anon";
GRANT ALL ON TABLE "public"."vw_margin_by_customer" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_margin_by_customer" TO "service_role";



GRANT ALL ON TABLE "public"."vw_margin_by_factory" TO "anon";
GRANT ALL ON TABLE "public"."vw_margin_by_factory" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_margin_by_factory" TO "service_role";



GRANT ALL ON TABLE "public"."vw_margin_by_modelo" TO "anon";
GRANT ALL ON TABLE "public"."vw_margin_by_modelo" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_margin_by_modelo" TO "service_role";



GRANT ALL ON TABLE "public"."vw_operativa_xiamen_vs_bsg" TO "anon";
GRANT ALL ON TABLE "public"."vw_operativa_xiamen_vs_bsg" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_operativa_xiamen_vs_bsg" TO "service_role";



GRANT ALL ON TABLE "public"."vw_qc_by_model" TO "anon";
GRANT ALL ON TABLE "public"."vw_qc_by_model" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_qc_by_model" TO "service_role";



GRANT ALL ON TABLE "public"."vw_user_customer_scope" TO "anon";
GRANT ALL ON TABLE "public"."vw_user_customer_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_user_customer_scope" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
