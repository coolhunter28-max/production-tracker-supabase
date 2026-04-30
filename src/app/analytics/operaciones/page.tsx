import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesFiltersBar } from "@/components/analytics/filters/OperacionesFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsSectionHeader } from "@/components/analytics/layout/AnalyticsSectionHeader";
import { OperacionesFocusBoard } from "@/components/analytics/operaciones/OperacionesFocusBoard";
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

type GenericRow = Record<string, unknown>;

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

function toNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function topRowByMetric(rows: GenericRow[], metric: string) {
  return rows.reduce<GenericRow | null>((best, row) => {
    const current = toNumber(row[metric]);
    if (current === null) return best;
    if (!best) return row;
    const bestValue = toNumber(best[metric]);
    if (bestValue === null || current > bestValue) return row;
    return best;
  }, null);
}

function formatNumber(value: unknown, decimals = 2) {
  const number = toNumber(value);
  if (number === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

function buildBaseParams(filters: OperacionesFilters) {
  const query = new URLSearchParams();
  if (filters.season) query.set("season", filters.season);
  if (filters.customer) query.set("customer", filters.customer);
  if (filters.factory) query.set("factory", filters.factory);
  if (filters.operativa) query.set("operativa", filters.operativa);
  if (filters.dateType) query.set("dateType", filters.dateType);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  return query;
}

function withQuery(path: string, query: URLSearchParams) {
  const value = query.toString();
  return value ? `${path}?${value}` : path;
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

  const topLogisticsCustomer = topRowByMetric(
    data.logisticsRanking as GenericRow[],
    "logistics_pressure_score"
  );
  const topRiskFactory = topRowByMetric(
    data.factoryRanking as GenericRow[],
    "risk_score"
  );
  const topDelayedSeason = topRowByMetric(
    data.seasonRanking as GenericRow[],
    "production_late_rate_pct"
  );
  const baseQuery = buildBaseParams(filters);

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

      <OperacionesFocusBoard
        logisticsRows={data.logisticsRanking}
        factoryRows={data.factoryRanking}
        filters={filters}
      />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Link
          href={withQuery(
            "/analytics/operaciones/logistica",
            (() => {
              const query = new URLSearchParams(baseQuery);
              const customer = topLogisticsCustomer?.customer;
              if (typeof customer === "string" && customer.trim()) {
                query.set("customer", customer);
              }
              return query;
            })()
          )}
          className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">Alerta logística líder</p>
            <span className="text-sm text-muted-foreground">→</span>
          </div>
          <p className="mt-1 text-sm font-semibold">
            {String(topLogisticsCustomer?.customer ?? "Sin datos")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Score: {formatNumber(topLogisticsCustomer?.logistics_pressure_score)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground underline">
            Ver detalle
          </p>
        </Link>

        <Link
          href={withQuery(
            "/analytics/operaciones/factories",
            (() => {
              const query = new URLSearchParams(baseQuery);
              const factory = topRiskFactory?.factory;
              if (typeof factory === "string" && factory.trim()) {
                query.set("factory", factory);
              }
              return query;
            })()
          )}
          className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">Fábrica más expuesta</p>
            <span className="text-sm text-muted-foreground">→</span>
          </div>
          <p className="mt-1 text-sm font-semibold">
            {String(topRiskFactory?.factory ?? "Sin datos")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Risk score: {formatNumber(topRiskFactory?.risk_score)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground underline">
            Ver detalle
          </p>
        </Link>

        <Link
          href={withQuery(
            "/analytics/operaciones/seasons",
            (() => {
              const query = new URLSearchParams(baseQuery);
              const season = topDelayedSeason?.season;
              if (typeof season === "string" && season.trim()) {
                query.set("season", season);
              }
              return query;
            })()
          )}
          className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">Season con más retraso</p>
            <span className="text-sm text-muted-foreground">→</span>
          </div>
          <p className="mt-1 text-sm font-semibold">
            {String(topDelayedSeason?.season ?? "Sin datos")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Late rate: {formatNumber(topDelayedSeason?.production_late_rate_pct)}%
          </p>
          <p className="mt-2 text-xs text-muted-foreground underline">
            Ver detalle
          </p>
        </Link>
      </section>

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