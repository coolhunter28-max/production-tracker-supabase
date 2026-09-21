import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import {
  buildMonetaryChange,
  calculateRelativeChange,
} from "@/lib/analytics/summary/change-utils";

export type PurchasesSummarySource = {
  current_value: number;
  comparison_value: number | null;

  current_avg_purchase_price: number | null;
  comparison_avg_purchase_price: number | null;

  current_pairs: number | null;
  comparison_pairs: number | null;

  current_orders: number | null;
  comparison_orders: number | null;

  current_sales: number | null;
  comparison_sales: number | null;

  current_bsg_margin: number | null;
  comparison_bsg_margin: number | null;
};

export function buildPurchasesSummary(
  row: PurchasesSummarySource,
): AnalyticsKpi[] {
  const purchasesChange = buildMonetaryChange(
    row.current_value,
    row.comparison_value,
  );

  const averagePriceChange = buildMonetaryChange(
    row.current_avg_purchase_price,
    row.comparison_avg_purchase_price,
  );

  const salesChange = buildMonetaryChange(
    row.current_sales,
    row.comparison_sales,
  );

  const bsgMarginChange = buildMonetaryChange(
    row.current_bsg_margin,
    row.comparison_bsg_margin,
  );

  return [
    {
      label: "Compras",
      value: row.current_value,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_value,
      changeValue: purchasesChange.changeValue,
      changeFormat: purchasesChange.changeFormat,
    },
    {
      label: "Precio medio compra/par",
      value: row.current_avg_purchase_price,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_avg_purchase_price,
      changeValue: averagePriceChange.changeValue,
      changeFormat: averagePriceChange.changeFormat,
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
      label: "Pedidos",
      value: row.current_orders,
      format: "integer",
      comparisonValue: row.comparison_orders,
      changeValue: calculateRelativeChange(
        row.current_orders,
        row.comparison_orders,
      ),
      changeFormat: "percentage",
    },
    {
      label: "Ventas",
      value: row.current_sales,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_sales,
      changeValue: salesChange.changeValue,
      changeFormat: salesChange.changeFormat,
    },
    {
      label: "Margen BSG",
      value: row.current_bsg_margin,
      format: "currency",
      currency: "USD",
      comparisonValue: row.comparison_bsg_margin,
      changeValue: bsgMarginChange.changeValue,
      changeFormat: bsgMarginChange.changeFormat,
    },
  ];
}
