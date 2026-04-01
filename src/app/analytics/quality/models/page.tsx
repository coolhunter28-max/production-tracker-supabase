import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityModelsFiltersBar } from "@/components/analytics/filters/QualityModelsFiltersBar";
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
  const style = getSingleParam(params.style);

  return {
    style,
  };
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

  const [rows, filterOptions] = await Promise.all([
    getQualityByModel(filters),
    getQualityFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Quality · Styles"
      description="Análisis de calidad por style."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/analytics/quality"
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver a Quality Overview
        </Link>
      </div>

      <QualityModelsFiltersBar styles={filterOptions.styles} />

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
    </AnalyticsPageShell>
  );
}