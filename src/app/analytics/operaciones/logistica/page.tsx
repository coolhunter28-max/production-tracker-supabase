import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesLogisticaFiltersBar } from "@/components/analytics/filters/OperacionesLogisticaFiltersBar";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
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
  return {
    customer: getSingleParam(params.customer),
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
  const overviewHref = buildOperacionesOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getOperacionesLogisticsRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell
      title="Operaciones · Logística"
      description="Análisis de presión logística y booking delay por customer."
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
          {hasRows ? `${rows.length} customers analizados` : "Sin resultados"}
        </div>
      </div>

      <OperacionesLogisticaFiltersBar customers={filterOptions.customers} />

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de logística para estos filtros"
          description="Prueba con otro customer o vuelve al overview de Operaciones manteniendo los filtros globales."
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsSection
            title="Presión logística"
            description="Ranking operativo por customer según presión logística, retrasos de booking y volumen de POs."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={LOGISTICS_PRESSURE_CONFIG.title}
                rows={rows}
                preferredColumns={
                  LOGISTICS_PRESSURE_CONFIG.preferredTableColumns
                }
              />

              <AnalyticsBarChart
                title={LOGISTICS_PRESSURE_CONFIG.title}
                rows={rows}
                labelKeys={LOGISTICS_PRESSURE_CONFIG.labelKeys}
                valueKeys={LOGISTICS_PRESSURE_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>

          <AnalyticsSection
            title="Booking delay"
            description="Ranking de customers con mayor retraso medio de booking y tasa de delay."
          >
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
          </AnalyticsSection>
        </div>
      )}
    </AnalyticsPageShell>
  );
}