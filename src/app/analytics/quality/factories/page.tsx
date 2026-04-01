import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityFactoriesFiltersBar } from "@/components/analytics/filters/QualityFactoriesFiltersBar";
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
  const factory = getSingleParam(params.factory);

  return {
    factory,
  };
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

  const [rows, filterOptions] = await Promise.all([
    getQualityByFactory(filters),
    getQualityFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Quality · Factories"
      description="Análisis de calidad por factory."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/analytics/quality"
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver a Quality Overview
        </Link>
      </div>

      <QualityFactoriesFiltersBar factories={filterOptions.factories} />

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

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={FACTORY_INSPECTION_CONFIG.title}
          rows={rows}
          preferredColumns={FACTORY_INSPECTION_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={FACTORY_INSPECTION_CONFIG.title}
          rows={rows}
          labelKeys={FACTORY_INSPECTION_CONFIG.labelKeys}
          valueKeys={FACTORY_INSPECTION_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}