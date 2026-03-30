import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesCustomersFiltersBar } from "@/components/analytics/filters/OperacionesCustomersFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getOperacionesCustomerRanking,
  getOperacionesFilterOptions,
} from "@/lib/analytics/queries/operaciones";
import type {
  OperacionesFilters,
  OperacionesRankingConfig,
} from "@/lib/analytics/types/operaciones";

type OperacionesCustomersPageProps = {
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

const CUSTOMER_VOLUME_CONFIG: OperacionesRankingConfig = {
  title: "Customer Volume Ranking",
  labelKeys: ["customer"],
  valueKeys: ["po_count", "sell_amount_total", "contribution_total"],
  preferredTableColumns: [
    "customer",
    "customer_size_band",
    "po_count",
    "sell_amount_total",
    "qty_total",
  ],
};

const CUSTOMER_MARGIN_CONFIG: OperacionesRankingConfig = {
  title: "Customer Contribution Ranking",
  labelKeys: ["customer"],
  valueKeys: ["contribution_total", "margin_total", "sell_amount_total"],
  preferredTableColumns: [
    "customer",
    "profitability_band",
    "contribution_total",
    "sell_amount_total",
    "po_count",
  ],
};

export default async function OperacionesCustomersPage({
  searchParams,
}: OperacionesCustomersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getOperacionesCustomerRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Operaciones · Customers"
      description="Análisis operativo por customer: volumen, contribución y posicionamiento."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/analytics/operaciones"
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver a Operaciones Overview
        </Link>
      </div>

      <OperacionesCustomersFiltersBar
        customers={filterOptions.customers}
      />

      <div className="grid gap-6 xl:grid-cols-2">
<AnalyticsRankingTable
  title={CUSTOMER_VOLUME_CONFIG.title}
  rows={rows}
/>
        <AnalyticsBarChart
          title={CUSTOMER_VOLUME_CONFIG.title}
          rows={rows}
          labelKeys={CUSTOMER_VOLUME_CONFIG.labelKeys}
          valueKeys={CUSTOMER_VOLUME_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
<AnalyticsRankingTable
  title={CUSTOMER_MARGIN_CONFIG.title}
  rows={rows}
/>
        <AnalyticsBarChart
          title={CUSTOMER_MARGIN_CONFIG.title}
          rows={rows}
          labelKeys={CUSTOMER_MARGIN_CONFIG.labelKeys}
          valueKeys={CUSTOMER_MARGIN_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}