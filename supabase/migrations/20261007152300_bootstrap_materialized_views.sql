-- Bootstrap materialized views for a clean database.
--
-- The baseline creates materialized views WITH NO DATA.
-- The two fact materialized views must be populated before
-- run_analytics_refresh() can refresh the dependent executive views.

REFRESH MATERIALIZED VIEW public.mv_fact_operacion_linea;
REFRESH MATERIALIZED VIEW public.mv_fact_operacion_linea_v2;

SELECT public.run_analytics_refresh();
