import { supabase } from "@/lib/supabase";
import { PO } from "@/types";

export async function fetchPOs(): Promise<PO[]> {
  const { data, error } = await supabase
    .from("pos")
    .select("*")
    .order("po_date", { ascending: false });

  if (error) {
    console.error("❌ Error fetching POs:", error);
    return [];
  }

  if (!data) return [];

  // ⚠️ REGLA: si no hay estado, generamos uno por defecto
  const enriched = data.map((po: any) => ({
    ...po,
    estado: po.estado || "Sin datos",
  }));

  return enriched;
}
