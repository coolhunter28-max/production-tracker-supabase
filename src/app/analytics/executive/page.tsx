import { ExecutiveKPIGrid } from "@/components/analytics/cards/ExecutiveKPIGrid";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { ExecutiveFiltersBar } from "@/components/analytics/filters/ExecutiveFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getExecutiveDashboardData,
  getExecutiveFilterOptions,
} from "@/lib/analytics/queries/executive";
import type {
  ExecutiveFilters,
  ExecutiveRankingConfig,
} from "@/lib/analytics/types/executive";

type ExecutivePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseExecutiveFilters(
  params: Record<string, string | string[] | undefined>
): ExecutiveFilters {
  const season = getSingleParam(params.season);
  const customer = getSingleParam(params.customer);
  const factory = getSingleParam(params.factory);
  const dateType = getSingleParam(params.dateType);
  const dateFrom = getSingleParam(params.dateFrom);
  const dateTo = getSingleParam(params.dateTo);

  return {
    season,
    customer,
    factory,
    dateType:
      dateType === "po" ||
      dateType === "pi_etd" ||
      dateType === "finish" ||
      dateType === "shipping"
        ? dateType
        : "shipping",
    dateFrom,
    dateTo,
  };
}

const CUSTOMER_RANKING_CONFIG: ExecutiveRankingConfig = {
  title: "Customer Ranking",
  labelKeys: ["customer"],
  valueKeys: [
    "contribution_total",
    "sell_amount_total",
    "margin_total",
    "po_count",
  ],
  preferredTableColumns: [
    "customer",
    "customer_size_band",
    "profitability_band",
    "po_count",
  ],
};

const FACTORY_RANKING_CONFIG: ExecutiveRankingConfig = {
  title: "Factory Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "risk_score",
    "contribution_total",
    "buy_amount_total",
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

const SEASON_RANKING_CONFIG: ExecutiveRankingConfig = {
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
  ],
};

export default async function ExecutivePage({
  searchParams,
}: ExecutivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseExecutiveFilters(resolvedSearchParams);

  const [data, filterOptions] = await Promise.all([
    getExecutiveDashboardData(filters),
    getExecutiveFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Executive Dashboard"
      description="Vista ejecutiva v1 basada en las views reales de Supabase."
    >
      <ExecutiveFiltersBar
        seasons={filterOptions.seasons}
        customers={filterOptions.customers}
        factories={filterOptions.factories}
      />

<section className="space-y-3">
  <div className="flex items-center justify-between gap-4">
    <h2 className="text-base font-medium">KPIs</h2>
    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
      KPIs globales · no afectados por filtros
    </span>
  </div>

  <ExecutiveKPIGrid rows={data.kpis} />
</section>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={CUSTOMER_RANKING_CONFIG.title}
          rows={data.customerRanking}
          preferredColumns={CUSTOMER_RANKING_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={CUSTOMER_RANKING_CONFIG.title}
          rows={data.customerRanking}
          labelKeys={CUSTOMER_RANKING_CONFIG.labelKeys}
          valueKeys={CUSTOMER_RANKING_CONFIG.valueKeys}
          maxItems={8}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={FACTORY_RANKING_CONFIG.title}
          rows={data.factoryRanking}
          preferredColumns={FACTORY_RANKING_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={FACTORY_RANKING_CONFIG.title}
          rows={data.factoryRanking}
          labelKeys={FACTORY_RANKING_CONFIG.labelKeys}
          valueKeys={FACTORY_RANKING_CONFIG.valueKeys}
          maxItems={8}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={SEASON_RANKING_CONFIG.title}
          rows={data.seasonRanking}
          preferredColumns={SEASON_RANKING_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={SEASON_RANKING_CONFIG.title}
          rows={data.seasonRanking}
          labelKeys={SEASON_RANKING_CONFIG.labelKeys}
          valueKeys={SEASON_RANKING_CONFIG.valueKeys}
          maxItems={8}
        />
      </div>
    </AnalyticsPageShell>
  );
}