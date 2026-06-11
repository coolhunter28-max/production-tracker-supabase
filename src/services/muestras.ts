import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Muestra } from "@/types";

export const fetchMuestrasByLineaId = async (lineaId: string) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("muestras")
    .select("*")
    .eq("linea_pedido_id", lineaId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as Muestra[];
};

export const createMuestra = async (
  muestra: Omit<Muestra, "id" | "created_at" | "updated_at">
) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("muestras")
    .insert([muestra])
    .select()
    .single();

  if (error) throw error;

  return data as Muestra;
};

export const getMuestraById = async (id: string) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("muestras")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as Muestra;
};

export const updateMuestra = async (
  id: string,
  updates: Partial<Muestra>
) => {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("muestras")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Muestra;
};

export const deleteMuestra = async (id: string) => {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from("muestras")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
};