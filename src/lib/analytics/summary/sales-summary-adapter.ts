import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import {
  buildMonetaryChange,
  calculateRelativeChange,
} from "@/lib/analytics/summary/change-utils";

export type SalesSummarySource = {
  current_value: number;
  comparison_value: number | null;
  current_pairs: number | null;
  comparison_pairs: number | null;
  current_avg_price: number | null;
  comparison_avg_price: number | null;
};

export function buildSalesSummary(
  row: SalesSummarySource,
): AnalyticsKpi[] {
  const change = buildMonetaryChange(
    row.current_value,
    row.comparison_value,
  );
  const averagePriceChange = buildMonetaryChange(
    row.current_avg_price,
    row.comparison_avg_price,
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
    {
      label: "Pares",
      value: row.current_pairs,
      format: "integer",
      comparisonValue: row.comparison_pairs,
      changeValue: calculateRelativeChange(
        row.current_pairs,
        row.comparison_pairs,
      ),
      changeFormat: "percentage",
    },
    {
      label: "Precio medio venta/par",
      value: row.current_avg_price,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_avg_price,
      changeValue: averagePriceChange.changeValue,
      changeFormat: averagePriceChange.changeFormat,
    },
  ];
}
