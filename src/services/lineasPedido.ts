import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { LineaPedido } from "@/types";

const LINEA_SELECT = `
  id,
  po_id,
  reference,
  style,
  color,
  size_run,
  qty,
  category,
  price,
  amount,
  pi_bsg,
  pi_number,
  price_selling,
  amount_selling,
  trial_upper,
  trial_lasting,
  lasting,
  finish_date,
  etd,
  inspection,
  estado_inspeccion,
  channel,
  modelo_id,
  variante_id,
  master_buy_price_used,
  master_sell_price_used,
  master_currency_used,
  master_valid_from_used,
  master_price_id_used,
  master_price_source,
  created_at,
  updated_at
`;

export const fetchLineasByPOId = async (poId: string) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("lineas_pedido")
    .select(LINEA_SELECT)
    .eq("po_id", poId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as LineaPedido[];
};

export const createLineaPedido = async (
  linea: Omit<LineaPedido, "id" | "created_at" | "updated_at">
) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("lineas_pedido")
    .insert([linea])
    .select(LINEA_SELECT)
    .single();

  if (error) throw error;

  return data as LineaPedido;
};

export const updateLineaPedido = async (
  id: string,
  updates: Partial<LineaPedido>
) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("lineas_pedido")
    .update(updates)
    .eq("id", id)
    .select(LINEA_SELECT)
    .single();

  if (error) throw error;

  return data as LineaPedido;
};

export const deleteLineaPedido = async (id: string) => {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from("lineas_pedido")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
};