// src/services/aprobaciones.ts
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export interface Aprobacion {
  id?: string;
  muestra_id: string;
  tipo_aprobacion: string;
  etapa?: string;
  estado_aprobacion: string;
  fecha_aprobacion?: string;
  notas?: string;
  created_at?: string;
}

function getSupabase() {
  return createBrowserSupabaseClient();
}

// 🔹 Crear aprobación
export const createAprobacion = async (aprobacion: Aprobacion) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("aprobaciones")
    .insert([aprobacion])
    .select();

  if (error) throw error;
  return data;
};

// 🔹 Obtener aprobaciones por muestra
export const fetchAprobacionesByMuestra = async (muestraId: string) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("aprobaciones")
    .select("*")
    .eq("muestra_id", muestraId)
    .order("fecha_aprobacion", { ascending: false });

  if (error) throw error;
  return data;
};

// 🔹 Obtener aprobaciones por etapa de producción
export const fetchAprobacionesByEtapa = async (
  lineaId: string,
  etapa: string
) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("aprobaciones")
    .select("*")
    .eq("tipo_aprobacion", "produccion")
    .eq("etapa", etapa)
    .eq("muestra_id", lineaId)
    .order("fecha_aprobacion", { ascending: false });

  if (error) throw error;
  return data;
};