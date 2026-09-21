import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import { calculatePercentagePointChange } from "@/lib/analytics/summary/change-utils";

export type ProfitabilitySummarySource = {
  current_value: number;
  comparison_value: number | null;
};

export function buildProfitabilitySummary(
  row: ProfitabilitySummarySource,
): AnalyticsKpi[] {
  return [
    {
      label: "Rentabilidad",
      value: row.current_value,
      format: "percentage",
      comparisonValue: row.comparison_value,
      changeValue: calculatePercentagePointChange(
        row.current_value,
        row.comparison_value,
      ),
      changeFormat: "percentage-points",
    },
  ];
}