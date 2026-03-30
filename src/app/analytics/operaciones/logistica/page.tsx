import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesLogisticaFiltersBar } from "@/components/analytics/filters/OperacionesLogisticaFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getOperacionesFilterOptions,
  getOperacionesLogisticsRanking,
} from "@/lib/analytics/queries/operaciones";
import type {
  OperacionesFilters,
  OperacionesRankingConfig,
} from "@/lib/analytics/types/operaciones";

type OperacionesLogisticaPageProps = {
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
  const customer = getSingleParam(params.customer);

  return {
    customer,
  };
}

const LOGISTICS_PRESSURE_CONFIG: OperacionesRankingConfig = {
  title: "Customer Logistics Pressure Ranking",
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

const LOGISTICS_DELAY_CONFIG: OperacionesRankingConfig = {
  title: "Customer Booking Delay Ranking",
  labelKeys: ["customer"],
  valueKeys: [
    "avg_booking_delay_days",
    "booking_delay_rate_pct",
    "logistics_pressure_score",
    "po_count",
  ],
  preferredTableColumns: [
    "customer",
    "avg_booking_delay_days",
    "booking_delay_rate_pct",
    "logistics_pressure_score",
    "po_count",
  ],
};

export default async function OperacionesLogisticaPage({
  searchParams,
}: OperacionesLogisticaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getOperacionesLogisticsRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Operaciones · Logística"
      description="Análisis de presión logística y booking delay por customer."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/analytics/operaciones"
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver a Operaciones Overview
        </Link>
      </div>

      <OperacionesLogisticaFiltersBar
        customers={filterOptions.customers}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={LOGISTICS_PRESSURE_CONFIG.title}
          rows={rows}
          preferredColumns={LOGISTICS_PRESSURE_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={LOGISTICS_PRESSURE_CONFIG.title}
          rows={rows}
          labelKeys={LOGISTICS_PRESSURE_CONFIG.labelKeys}
          valueKeys={LOGISTICS_PRESSURE_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={LOGISTICS_DELAY_CONFIG.title}
          rows={rows}
          preferredColumns={LOGISTICS_DELAY_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={LOGISTICS_DELAY_CONFIG.title}
          rows={rows}
          labelKeys={LOGISTICS_DELAY_CONFIG.labelKeys}
          valueKeys={LOGISTICS_DELAY_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}