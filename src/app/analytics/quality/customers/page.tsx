import Link from "next/link";
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityCustomersFiltersBar } from "@/components/analytics/filters/QualityCustomersFiltersBar";
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
  const customer = getSingleParam(params.customer);

  return {
    customer,
  };
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

  const [rows, filterOptions] = await Promise.all([
    getQualityByCustomer(filters),
    getQualityFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Quality · Customers"
      description="Análisis de calidad por customer."
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/analytics/quality"
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Volver a Quality Overview
        </Link>
      </div>

      <QualityCustomersFiltersBar customers={filterOptions.customers} />

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

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={CUSTOMER_INSPECTION_CONFIG.title}
          rows={rows}
          preferredColumns={CUSTOMER_INSPECTION_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={CUSTOMER_INSPECTION_CONFIG.title}
          rows={rows}
          labelKeys={CUSTOMER_INSPECTION_CONFIG.labelKeys}
          valueKeys={CUSTOMER_INSPECTION_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}