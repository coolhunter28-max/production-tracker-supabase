import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import {
  buildMonetaryChange,
  calculatePercentagePointChange,
} from "@/lib/analytics/summary/change-utils";

export type BsgMarginSummarySource = {
  current_value: number;
  current_percentage: number | null;
  comparison_value: number | null;
  comparison_percentage: number | null;
};

export function buildBsgMarginSummary(
  row: BsgMarginSummarySource,
): AnalyticsKpi[] {
  const monetaryChange = buildMonetaryChange(
    row.current_value,
    row.comparison_value,
  );

  return [
    {
      label: "Margen BSG",
      value: row.current_value,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_value,
      changeValue: monetaryChange.changeValue,
      changeFormat: monetaryChange.changeFormat,
    },
    {
      label: "Margen BSG %",
      value: row.current_percentage,
      format: "percentage",
      comparisonValue: row.comparison_percentage,
      changeValue: calculatePercentagePointChange(
        row.current_percentage,
        row.comparison_percentage,
      ),
      changeFormat: "percentage-points",
    },
  ];
}
