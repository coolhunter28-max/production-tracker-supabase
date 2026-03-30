import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesFiltersBar } from "@/components/analytics/filters/OperacionesFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsSectionHeader } from "@/components/analytics/layout/AnalyticsSectionHeader";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getOperacionesFilterOptions,
  getOperacionesOverviewData,
} from "@/lib/analytics/queries/operaciones";
import type {
  OperacionesFilters,
  OperacionesRankingConfig,
} from "@/lib/analytics/types/operaciones";

type OperacionesPageProps = {
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
  const customer = getSingleParam(params.customer);
  const factory = getSingleParam(params.factory);
  const operativa = getSingleParam(params.operativa);
  const dateType = getSingleParam(params.dateType);
  const dateFrom = getSingleParam(params.dateFrom);
  const dateTo = getSingleParam(params.dateTo);

  return {
    season,
    customer,
    factory,
    operativa,
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

const CUSTOMER_CONFIG: OperacionesRankingConfig = {
  title: "Customers",
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

const FACTORY_CONFIG: OperacionesRankingConfig = {
  title: "Factories",
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

const SEASON_CONFIG: OperacionesRankingConfig = {
  title: "Seasons",
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

const LOGISTICS_CONFIG: OperacionesRankingConfig = {
  title: "Logistics Pressure",
  labelKeys: ["customer"],
  valueKeys: [
    "logistics_pressure_score",
    "booking_delay_rate_pct",
    "avg_booking_delay_days",
    "po_count",
  ],
  preferredTableColumns: [
    "customer",
    "logistics_pressure_score",
    "booking_delay_rate_pct",
    "avg_booking_delay_days",
    "po_count",
  ],
};

export default async function OperacionesPage({
  searchParams,
}: OperacionesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);

  const [data, filterOptions] = await Promise.all([
    getOperacionesOverviewData(filters),
    getOperacionesFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Operaciones Overview"
      description="Vista operativa global de volumen, contribución, retrasos y presión logística."
    >
      <OperacionesFiltersBar
        seasons={filterOptions.seasons}
        customers={filterOptions.customers}
        factories={filterOptions.factories}
      />

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="Customers"
          href="/analytics/operaciones/customers"
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsRankingTable
            title={CUSTOMER_CONFIG.title}
            rows={data.customerRanking}
            preferredColumns={CUSTOMER_CONFIG.preferredTableColumns}
          />
          <AnalyticsBarChart
            title={CUSTOMER_CONFIG.title}
            rows={data.customerRanking}
            labelKeys={CUSTOMER_CONFIG.labelKeys}
            valueKeys={CUSTOMER_CONFIG.valueKeys}
            maxItems={8}
          />
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="Factories & Logistics"
          href="/analytics/operaciones/factories"
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsRankingTable
            title={FACTORY_CONFIG.title}
            rows={data.factoryRanking}
            preferredColumns={FACTORY_CONFIG.preferredTableColumns}
          />
          <AnalyticsRankingTable
            title={LOGISTICS_CONFIG.title}
            rows={data.logisticsRanking}
            preferredColumns={LOGISTICS_CONFIG.preferredTableColumns}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsBarChart
            title={FACTORY_CONFIG.title}
            rows={data.factoryRanking}
            labelKeys={FACTORY_CONFIG.labelKeys}
            valueKeys={FACTORY_CONFIG.valueKeys}
            maxItems={8}
          />
          <AnalyticsBarChart
            title={LOGISTICS_CONFIG.title}
            rows={data.logisticsRanking}
            labelKeys={LOGISTICS_CONFIG.labelKeys}
            valueKeys={LOGISTICS_CONFIG.valueKeys}
            maxItems={8}
          />
        </div>

        <div className="flex gap-3">
          <a
            href="/analytics/operaciones/factories"
            className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Ver factories
          </a>
          <a
            href="/analytics/operaciones/logistica"
            className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Ver logística
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="Seasons"
          href="/analytics/operaciones/seasons"
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsRankingTable
            title={SEASON_CONFIG.title}
            rows={data.seasonRanking}
            preferredColumns={SEASON_CONFIG.preferredTableColumns}
          />
          <AnalyticsBarChart
            title={SEASON_CONFIG.title}
            rows={data.seasonRanking}
            labelKeys={SEASON_CONFIG.labelKeys}
            valueKeys={SEASON_CONFIG.valueKeys}
            maxItems={8}
          />
        </div>
      </section>
    </AnalyticsPageShell>
  );
}