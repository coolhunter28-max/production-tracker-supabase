import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityCustomersFiltersBar } from "@/components/analytics/filters/QualityCustomersFiltersBar";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getQualityByCustomer,
  getQualityFilterOptions,
} from "@/lib/analytics/queries/quality";
import type {
  QualityFilters,
  QualityRankingConfig,
} from "@/lib/analytics/types/quality";

type QualityCustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseQualityFilters(
  params: Record<string, string | string[] | undefined>
): QualityFilters {
  return {
    customer: getSingleParam(params.customer),
  };
}

function buildQualityOverviewHref(
  params: Record<string, string | string[] | undefined>
) {
  const query = new URLSearchParams();

  const keys = [
    "season",
    "customer",
    "factory",
    "qcType",
    "dateType",
    "dateFrom",
    "dateTo",
  ];

  for (const key of keys) {
    const value = getSingleParam(params[key]);
    if (value) query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `/analytics/quality?${queryString}` : "/analytics/quality";
}

const CUSTOMER_QUALITY_CONFIG: QualityRankingConfig = {
  title: "Customer Quality Ranking",
  labelKeys: ["customer"],
  valueKeys: [
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
    "failed_inspections",
    "inspection_count",
  ],
  preferredTableColumns: [
    "customer",
    "inspection_count",
    "failed_inspections",
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
  ],
};

const CUSTOMER_INSPECTION_CONFIG: QualityRankingConfig = {
  title: "Customer Inspection Ranking",
  labelKeys: ["customer"],
  valueKeys: [
    "inspection_count",
    "qty_inspected_total",
    "failed_inspections",
    "po_count",
  ],
  preferredTableColumns: [
    "customer",
    "inspection_count",
    "qty_inspected_total",
    "po_count",
    "failed_inspections",
  ],
};

export default async function QualityCustomersPage({
  searchParams,
}: QualityCustomersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseQualityFilters(resolvedSearchParams);
  const overviewHref = buildQualityOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getQualityByCustomer(filters),
    getQualityFilterOptions(),
  ]);

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell
      title="Quality · Customers"
      description="Análisis de calidad por customer: defect rate, fail rate e inspecciones."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={overviewHref}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Quality Overview
        </Link>

        <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {hasRows ? `${rows.length} customers analizados` : "Sin resultados"}
        </div>
      </div>

      <QualityCustomersFiltersBar customers={filterOptions.customers} />

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de calidad para estos filtros"
          description="Prueba con otro customer o vuelve al overview de Quality manteniendo los filtros globales."
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsSection
            title="Riesgo de calidad por customer"
            description="Ranking de customers según defect rate, fail rate e inspecciones fallidas."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={CUSTOMER_QUALITY_CONFIG.title}
                rows={rows}
                preferredColumns={CUSTOMER_QUALITY_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={CUSTOMER_QUALITY_CONFIG.title}
                rows={rows}
                labelKeys={CUSTOMER_QUALITY_CONFIG.labelKeys}
                valueKeys={CUSTOMER_QUALITY_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>

          <AnalyticsSection
            title="Volumen de inspección"
            description="Ranking por número de inspecciones, cantidad inspeccionada, POs y fallos detectados."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={CUSTOMER_INSPECTION_CONFIG.title}
                rows={rows}
                preferredColumns={
                  CUSTOMER_INSPECTION_CONFIG.preferredTableColumns
                }
              />

              <AnalyticsBarChart
                title={CUSTOMER_INSPECTION_CONFIG.title}
                rows={rows}
                labelKeys={CUSTOMER_INSPECTION_CONFIG.labelKeys}
                valueKeys={CUSTOMER_INSPECTION_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>
        </div>
      )}
    </AnalyticsPageShell>
  );
}