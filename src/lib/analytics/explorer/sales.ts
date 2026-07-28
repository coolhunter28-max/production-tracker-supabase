import type { AnalysisContext } from "@/lib/analytics/context/analysis-context";
import { createClient } from "@/lib/supabase";

export type ExplorerSalesByCustomerRow = {
  ranking: number;
  customer: string;
  current_value: number;
  comparison_value: number | null;
  delta_value: number | null;
  delta_pct: number | null;
};

type ExplorerSalesByCustomerRpcRow = {
  ranking: number | string | null;
  customer: string | null;
  current_value: number | string | null;
  comparison_value: number | string | null;
  delta_value: number | string | null;
  delta_pct: number | string | null;
};

function toNumber(value: number | string | null): number {
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

export async function getExplorerSalesByCustomer(
  context: AnalysisContext,
  limit = 20,
): Promise<ExplorerSalesByCustomerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_explorer_sales_by_customer_v1",
    {
      p_seasons:
        context.seasons.length > 0 ? context.seasons : null,
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
      `[getExplorerSalesByCustomer] No se pudo cargar el ranking: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as ExplorerSalesByCustomerRpcRow[];

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
      },
    ];
  });
}