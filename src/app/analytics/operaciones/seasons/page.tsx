import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesSeasonsFiltersBar } from "@/components/analytics/filters/OperacionesSeasonsFiltersBar";
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
  const season = getSingleParam(params.season);

  return {
    season,
  };
}

function buildOperacionesOverviewHref(
  params: Record<string, string | string[] | undefined>
) {
  const query = new URLSearchParams();
  const keys = ["season", "customer", "factory", "operativa", "dateType", "dateFrom", "dateTo"];

  for (const key of keys) {
    const value = getSingleParam(params[key]);
    if (value) query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `/analytics/operaciones?${queryString}` : "/analytics/operaciones";
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

  return (
    <AnalyticsPageShell
      title="Operaciones · Seasons"
      description="Análisis comparativo por season: performance y comportamiento operativo."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href={overviewHref}
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver atrás
        </Link>
      </div>

      <OperacionesSeasonsFiltersBar
        seasons={filterOptions.seasons}
      />

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
    </AnalyticsPageShell>
  );
}