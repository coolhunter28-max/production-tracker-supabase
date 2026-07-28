import type { AnalysisContext } from "@/lib/analytics/context/analysis-context";
import { createClient } from "@/lib/supabase";

export type ExplorerXiamenCommissionByCustomerRow = {
  ranking: number;
  customer: string;
  current_value: number;
  current_commission_pct: number | null;
  comparison_value: number | null;
  comparison_commission_pct: number | null;
  delta_value: number | null;
  delta_pct: number | null;
};

type ExplorerXiamenCommissionByCustomerRpcRow = {
  ranking: number | string | null;
  customer: string | null;
  current_value: number | string | null;
  current_commission_pct: number | string | null;
  comparison_value: number | string | null;
  comparison_commission_pct: number | string | null;
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

export async function getExplorerXiamenCommissionByCustomer(
  context: AnalysisContext,
  limit = 20,
): Promise<ExplorerXiamenCommissionByCustomerRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_explorer_xiamen_commission_by_customer_v1",
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
      `[getExplorerXiamenCommissionByCustomer] No se pudo cargar el ranking: ${error.message}`,
    );
  }

  const rows =
    (data ??
      []) as unknown as ExplorerXiamenCommissionByCustomerRpcRow[];

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
        current_commission_pct: toNullableNumber(
          row.current_commission_pct,
        ),
        comparison_value: toNullableNumber(
          row.comparison_value,
        ),
        comparison_commission_pct: toNullableNumber(
          row.comparison_commission_pct,
        ),
        delta_value: toNullableNumber(row.delta_value),
        delta_pct: toNullableNumber(row.delta_pct),
      },
    ];
  });
}