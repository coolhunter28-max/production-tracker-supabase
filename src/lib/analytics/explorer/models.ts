import { createClient } from "@/lib/supabase";

export type ExplorerModelMetric = "sales" | "purchases";

export type ExplorerModelRow = {
  modelo_id: string;
  style: string;
  pairs: number;
  value: number;
};

type ExplorerModelRpcRow = {
  modelo_id: string | null;
  style: string | null;
  pairs: number | string | null;
  value: number | string | null;
};

function parseNumeric(value: number | string | null): number {
  if (value === null || value === "" || !Number.isFinite(Number(value))) {
    throw new Error("[getExplorerModels] La RPC devolvió un importe o pares inválidos.");
  }
  return Number(value);
}

export async function getExplorerModels(
  customer: string,
  season: string,
  metric: ExplorerModelMetric,
): Promise<ExplorerModelRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_explorer_models_v1", {
    p_customer: customer,
    p_season: season,
    p_metric: metric,
  });

  if (error) {
    throw new Error(`[getExplorerModels] No se pudieron cargar los modelos: ${error.message}`);
  }

  // Preserve the backend's identity, ordering and aggregation; never drop invalid rows.
  return ((data ?? []) as ExplorerModelRpcRow[]).map((row) => {
    if (!row.modelo_id || !row.style?.trim()) {
      throw new Error("[getExplorerModels] La RPC devolvió un modelo sin identidad o etiqueta.");
    }
    return {
      modelo_id: row.modelo_id,
      style: row.style,
      pairs: parseNumeric(row.pairs),
      value: parseNumeric(row.value),
    };
  });
}
