import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesFactoriesFiltersBar } from "@/components/analytics/filters/OperacionesFactoriesFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getOperacionesFactoryRanking,
  getOperacionesFilterOptions,
} from "@/lib/analytics/queries/operaciones";
import type {
  OperacionesFilters,
  OperacionesRankingConfig,
} from "@/lib/analytics/types/operaciones";

type OperacionesFactoriesPageProps = {
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
  const factory = getSingleParam(params.factory);

  return {
    factory,
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

const FACTORY_RISK_CONFIG: OperacionesRankingConfig = {
  title: "Factory Risk Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "risk_score",
    "production_late_rate_pct",
    "late_lines",
    "po_count",
  ],
  preferredTableColumns: [
    "factory",
    "risk_level",
    "risk_score",
    "lines_with_delay_basis",
    "late_lines",
    "production_late_rate_pct",
  ],
};

const FACTORY_VOLUME_CONFIG: OperacionesRankingConfig = {
  title: "Factory Volume Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "po_count",
    "qty_total",
    "buy_amount_total",
    "contribution_total",
  ],
  preferredTableColumns: [
    "factory",
    "po_count",
    "line_count",
    "qty_total",
    "buy_amount_total",
    "contribution_total",
  ],
};

export default async function OperacionesFactoriesPage({
  searchParams,
}: OperacionesFactoriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);
  const overviewHref = buildOperacionesOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getOperacionesFactoryRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Operaciones · Factories"
      description="Análisis operativo por factory: riesgo, retrasos y volumen."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href={overviewHref}
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver atrás
        </Link>
      </div>

      <OperacionesFactoriesFiltersBar
        factories={filterOptions.factories}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={FACTORY_RISK_CONFIG.title}
          rows={rows}
          preferredColumns={FACTORY_RISK_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={FACTORY_RISK_CONFIG.title}
          rows={rows}
          labelKeys={FACTORY_RISK_CONFIG.labelKeys}
          valueKeys={FACTORY_RISK_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={FACTORY_VOLUME_CONFIG.title}
          rows={rows}
          preferredColumns={FACTORY_VOLUME_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={FACTORY_VOLUME_CONFIG.title}
          rows={rows}
          labelKeys={FACTORY_VOLUME_CONFIG.labelKeys}
          valueKeys={FACTORY_VOLUME_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}