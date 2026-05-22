import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityFactoriesFiltersBar } from "@/components/analytics/filters/QualityFactoriesFiltersBar";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getQualityByFactory,
  getQualityFilterOptions,
} from "@/lib/analytics/queries/quality";
import type {
  QualityFilters,
  QualityRankingConfig,
} from "@/lib/analytics/types/quality";

type QualityFactoriesPageProps = {
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
    factory: getSingleParam(params.factory),
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

const FACTORY_QUALITY_CONFIG: QualityRankingConfig = {
  title: "Factory Quality Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
    "failed_inspections",
    "inspection_count",
  ],
  preferredTableColumns: [
    "factory",
    "inspection_count",
    "failed_inspections",
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
  ],
};

const FACTORY_INSPECTION_CONFIG: QualityRankingConfig = {
  title: "Factory Inspection Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "inspection_count",
    "qty_inspected_total",
    "failed_inspections",
    "po_count",
  ],
  preferredTableColumns: [
    "factory",
    "inspection_count",
    "qty_inspected_total",
    "po_count",
    "failed_inspections",
  ],
};

export default async function QualityFactoriesPage({
  searchParams,
}: QualityFactoriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseQualityFilters(resolvedSearchParams);
  const overviewHref = buildQualityOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getQualityByFactory(filters),
    getQualityFilterOptions(),
  ]);

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell
      title="Quality · Factories"
      description="Análisis de calidad por factory: defect rate, fail rate e inspecciones."
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
          {hasRows ? `${rows.length} factories analizadas` : "Sin resultados"}
        </div>
      </div>

      <QualityFactoriesFiltersBar factories={filterOptions.factories} />

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de calidad para estos filtros"
          description="Prueba con otra factory o vuelve al overview de Quality manteniendo los filtros globales."
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsSection
            title="Riesgo de calidad por factory"
            description="Ranking de factories según defect rate, fail rate e inspecciones fallidas."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={FACTORY_QUALITY_CONFIG.title}
                rows={rows}
                preferredColumns={FACTORY_QUALITY_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={FACTORY_QUALITY_CONFIG.title}
                rows={rows}
                labelKeys={FACTORY_QUALITY_CONFIG.labelKeys}
                valueKeys={FACTORY_QUALITY_CONFIG.valueKeys}
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
                title={FACTORY_INSPECTION_CONFIG.title}
                rows={rows}
                preferredColumns={
                  FACTORY_INSPECTION_CONFIG.preferredTableColumns
                }
              />

              <AnalyticsBarChart
                title={FACTORY_INSPECTION_CONFIG.title}
                rows={rows}
                labelKeys={FACTORY_INSPECTION_CONFIG.labelKeys}
                valueKeys={FACTORY_INSPECTION_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>
        </div>
      )}
    </AnalyticsPageShell>
  );
}