import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { QualityFiltersBar } from "@/components/analytics/filters/QualityFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import {
  getQualityFilterOptions,
  getQualityOverviewData,
} from "@/lib/analytics/queries/quality";
import type {
  QualityFilters,
  QualityRankingConfig,
} from "@/lib/analytics/types/quality";

type QualityPageProps = {
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
  const factory = getSingleParam(params.factory);
  const style = getSingleParam(params.style);

  return {
    customer,
    factory,
    style,
  };
}

const CUSTOMER_CONFIG: QualityRankingConfig = {
  title: "Quality by Customer",
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

const FACTORY_CONFIG: QualityRankingConfig = {
  title: "Quality by Factory",
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

const MODEL_CONFIG: QualityRankingConfig = {
  title: "Quality by Style",
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

export default async function QualityPage({
  searchParams,
}: QualityPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseQualityFilters(resolvedSearchParams);

  const [data, filterOptions] = await Promise.all([
    getQualityOverviewData(filters),
    getQualityFilterOptions(),
  ]);

  return (
    <AnalyticsPageShell
      title="Quality Overview"
      description="Vista global de calidad por customer, factory y style."
    >
      <QualityFiltersBar
        customers={filterOptions.customers}
        factories={filterOptions.factories}
        styles={filterOptions.styles}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={CUSTOMER_CONFIG.title}
          rows={data.customerRows}
          preferredColumns={CUSTOMER_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={CUSTOMER_CONFIG.title}
          rows={data.customerRows}
          labelKeys={CUSTOMER_CONFIG.labelKeys}
          valueKeys={CUSTOMER_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={FACTORY_CONFIG.title}
          rows={data.factoryRows}
          preferredColumns={FACTORY_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={FACTORY_CONFIG.title}
          rows={data.factoryRows}
          labelKeys={FACTORY_CONFIG.labelKeys}
          valueKeys={FACTORY_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsRankingTable
          title={MODEL_CONFIG.title}
          rows={data.modelRows}
          preferredColumns={MODEL_CONFIG.preferredTableColumns}
        />
        <AnalyticsBarChart
          title={MODEL_CONFIG.title}
          rows={data.modelRows}
          labelKeys={MODEL_CONFIG.labelKeys}
          valueKeys={MODEL_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}