import type { AnalysisContext } from "@/lib/analytics/context/analysis-context";
import { createClient } from "@/lib/supabase";

export type ExplorerPurchasesByCustomerRow = {
  ranking: number;
  customer: string;
  current_value: number;
  comparison_value: number | null;
  delta_value: number | null;
  delta_pct: number | null;

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

type ExplorerPurchasesByCustomerRpcRow = {
  ranking: number | string | null;
  customer: string | null;
  current_value: number | string | null;
  comparison_value: number | string | null;
  delta_value: number | string | null;
  delta_pct: number | string | null;

  current_avg_purchase_price: number | string | null;
  comparison_avg_purchase_price: number | string | null;

  current_pairs: number | string | null;
  comparison_pairs: number | string | null;

  current_orders: number | string | null;
  comparison_orders: number | string | null;

  current_sales: number | string | null;
  comparison_sales: number | string | null;

  current_bsg_margin: number | string | null;
  comparison_bsg_margin: number | string | null;
};

function toNumber(
  value: number | string | null,
): number {
  if (value === null) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(
  value: number | string | null,
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function getExplorerPurchasesByCustomer(
  context: AnalysisContext,
  limit = 20,
): Promise<ExplorerPurchasesByCustomerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_explorer_purchases_by_customer_v1",
    {
      p_seasons:
        context.seasons.length > 0
          ? context.seasons
          : null,
      p_comparison_seasons:
        context.comparisonSeasons.length > 0
          ? context.comparisonSeasons
          : null,
      p_include_all: context.isHistorical,
      p_limit: Math.max(1, limit),
    },
  );

  if (error) {
    throw new Error(
      `[getExplorerPurchasesByCustomer] No se pudo cargar el ranking: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as ExplorerPurchasesByCustomerRpcRow[];

  return rows.flatMap((row) => {
    const customer = row.customer?.trim();

    if (!customer) {
      return [];
    }

    return [
      {
        ranking: toNumber(row.ranking),
        customer,
        current_value: toNumber(row.current_value),
        comparison_value: toNullableNumber(
          row.comparison_value,
        ),
        delta_value: toNullableNumber(row.delta_value),
        delta_pct: toNullableNumber(row.delta_pct),

        current_avg_purchase_price: toNullableNumber(
          row.current_avg_purchase_price,
        ),
        comparison_avg_purchase_price: toNullableNumber(
          row.comparison_avg_purchase_price,
        ),

        current_pairs: toNullableNumber(row.current_pairs),
        comparison_pairs: toNullableNumber(
          row.comparison_pairs,
        ),

        current_orders: toNullableNumber(row.current_orders),
        comparison_orders: toNullableNumber(
          row.comparison_orders,
        ),

        current_sales: toNullableNumber(row.current_sales),
        comparison_sales: toNullableNumber(
          row.comparison_sales,
        ),

        current_bsg_margin: toNullableNumber(
          row.current_bsg_margin,
        ),
        comparison_bsg_margin: toNullableNumber(
          row.comparison_bsg_margin,
        ),
      },
    ];
  });
}
