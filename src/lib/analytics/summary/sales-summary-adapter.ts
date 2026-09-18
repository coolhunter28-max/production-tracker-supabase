import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import { buildMonetaryChange } from "@/lib/analytics/summary/change-utils";

export type SalesSummarySource = {
  current_value: number;
  comparison_value: number | null;
};

export function buildSalesSummary(
  row: SalesSummarySource,
): AnalyticsKpi[] {
  const change = buildMonetaryChange(
    row.current_value,
    row.comparison_value,
  );

  return [
    {
      label: "Ventas",
      value: row.current_value,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_value,
      changeValue: change.changeValue,
      changeFormat: change.changeFormat,
    },
  ];
}
