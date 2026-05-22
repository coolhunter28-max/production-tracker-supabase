import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityModelsFiltersBar } from "@/components/analytics/filters/QualityModelsFiltersBar";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getQualityByModel,
  getQualityFilterOptions,
} from "@/lib/analytics/queries/quality";
import type {
  QualityFilters,
  QualityRankingConfig,
} from "@/lib/analytics/types/quality";

type QualityModelsPageProps = {
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
    style: getSingleParam(params.style),
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
    "style",
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

const STYLE_QUALITY_CONFIG: QualityRankingConfig = {
  title: "Style Quality Ranking",
  labelKeys: ["style"],
  valueKeys: [
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
    "failed_inspections",
    "inspection_count",
  ],
  preferredTableColumns: [
    "style",
    "reference",
    "season",
    "inspection_count",
    "failed_inspections",
    "avg_defect_rate_pct",
    "qc_fail_rate_pct",
  ],
};

const STYLE_INSPECTION_CONFIG: QualityRankingConfig = {
  title: "Style Inspection Ranking",
  labelKeys: ["style"],
  valueKeys: [
    "inspection_count",
    "qty_inspected_total",
    "po_count",
    "failed_inspections",
  ],
  preferredTableColumns: [
    "style",
    "reference",
    "inspection_count",
    "qty_inspected_total",
    "po_count",
    "failed_inspections",
  ],
};

export default async function QualityModelsPage({
  searchParams,
}: QualityModelsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseQualityFilters(resolvedSearchParams);
  const overviewHref = buildQualityOverviewHref(resolvedSearchParams);

  const [rows, filterOptions] = await Promise.all([
    getQualityByModel(filters),
    getQualityFilterOptions(),
  ]);

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell
      title="Quality · Styles"
      description="Análisis de calidad por style: defect rate, fail rate e inspecciones."
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
          {hasRows ? `${rows.length} styles analizados` : "Sin resultados"}
        </div>
      </div>

      <QualityModelsFiltersBar styles={filterOptions.styles} />

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de calidad para estos filtros"
          description="Prueba con otro style o vuelve al overview de Quality manteniendo los filtros globales."
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsSection
            title="Riesgo de calidad por style"
            description="Ranking de styles según defect rate, fail rate e inspecciones fallidas."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={STYLE_QUALITY_CONFIG.title}
                rows={rows}
                preferredColumns={STYLE_QUALITY_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={STYLE_QUALITY_CONFIG.title}
                rows={rows}
                labelKeys={STYLE_QUALITY_CONFIG.labelKeys}
                valueKeys={STYLE_QUALITY_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>

          <AnalyticsSection
            title="Volumen de inspección por style"
            description="Ranking por inspecciones, cantidad inspeccionada, POs y fallos detectados."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <AnalyticsRankingTable
                title={STYLE_INSPECTION_CONFIG.title}
                rows={rows}
                preferredColumns={STYLE_INSPECTION_CONFIG.preferredTableColumns}
              />

              <AnalyticsBarChart
                title={STYLE_INSPECTION_CONFIG.title}
                rows={rows}
                labelKeys={STYLE_INSPECTION_CONFIG.labelKeys}
                valueKeys={STYLE_INSPECTION_CONFIG.valueKeys}
                maxItems={10}
              />
            </div>
          </AnalyticsSection>
        </div>
      )}
    </AnalyticsPageShell>
  );
}