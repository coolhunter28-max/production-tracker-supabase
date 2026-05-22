import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesSeasonsFiltersBar } from "@/components/analytics/filters/OperacionesSeasonsFiltersBar";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getOperacionesFilterOptions,
  getOperacionesSeasonRanking,
} from "@/lib/analytics/queries/operaciones";
import type {
  OperacionesFilters,
  OperacionesRankingConfig,
} from "@/lib/analytics/types/operaciones";

type OperacionesSeasonsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOperacionesFilters(
  params: Record<string, string | string[] | undefined>
): OperacionesFilters {
  return {
    season: getSingleParam(params.season),
  };
}

function buildOperacionesOverviewHref(
  params: Record<string, string | string[] | undefined>
) {
  const query = new URLSearchParams();

  const keys = [
    "season",
    "customer",
    "factory",
    "operativa",
    "dateType",
    "dateFrom",
    "dateTo",
  ];

  for (const key of keys) {
    const value = getSingleParam(params[key]);
    if (value) query.set(key, value);
  }

  const queryString = query.toString();
  return queryString
    ? `/analytics/operaciones?${queryString}`
    : "/analytics/operaciones";
}

const SEASON_PERFORMANCE_CONFIG: OperacionesRankingConfig = {
  title: "Season Performance Ranking",
  labelKeys: ["season"],
  valueKeys: [
    "contribution_total",
    "sell_amount_total",
    "margin_total",
    "po_count",
  ],
  preferredTableColumns: [
    "season",
    "po_count",
    "line_count",
    "qty_total",
    "sell_amount_total",
    "contribution_total",
  ],
};

const SEASON_OPERATIONAL_CONFIG: OperacionesRankingConfig = {
  title: "Season Operational Ranking",
  labelKeys: ["season"],
  valueKeys: [
    "production_late_rate_pct",
    "booking_delay_rate_pct",
    "avg_delay_production_days",
    "po_count",
  ],
  preferredTableColumns: [
    "season",
    "production_late_rate_pct",
    "booking_delay_rate_pct",
    "avg_delay_production_days",
    "po_count",
  ],
};

export default async function OperacionesSeasonsPage({
  searchParams,
}: OperacionesSeasonsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);
  const overviewHref = buildOperacionesOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getOperacionesSeasonRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell
      title="Operaciones · Seasons"
      description="Análisis comparativo por season: performance económica y comportamiento operativo."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={overviewHref}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Operaciones
        </Link>

        <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {hasRows ? `${rows.length} seasons analizadas` : "Sin resultados"}
        </div>
      </div>

      <OperacionesSeasonsFiltersBar seasons={filterOptions.seasons} />

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de seasons para estos filtros"
          description="Prueba con otra season o vuelve al overview de Operaciones manteniendo los filtros globales."
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsSection
            title="Performance por season"
            description="Ranking comparativo por contribución, venta, margen y volumen operativo."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={SEASON_PERFORMANCE_CONFIG.title}
                rows={rows}
                preferredColumns={SEASON_PERFORMANCE_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={SEASON_PERFORMANCE_CONFIG.title}
                rows={rows}
                labelKeys={SEASON_PERFORMANCE_CONFIG.labelKeys}
                valueKeys={SEASON_PERFORMANCE_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>

          <AnalyticsSection
            title="Riesgo operativo por season"
            description="Ranking de seasons con mayor late rate, booking delay y retraso medio de producción."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={SEASON_OPERATIONAL_CONFIG.title}
                rows={rows}
                preferredColumns={SEASON_OPERATIONAL_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={SEASON_OPERATIONAL_CONFIG.title}
                rows={rows}
                labelKeys={SEASON_OPERATIONAL_CONFIG.labelKeys}
                valueKeys={SEASON_OPERATIONAL_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>
        </div>
      )}
    </AnalyticsPageShell>
  );
}