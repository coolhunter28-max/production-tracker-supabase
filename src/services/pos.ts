import { supabase } from "@/lib/supabase";   // ⬅️ ANTES ponía supabaseClient
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

  return data || [];
}
