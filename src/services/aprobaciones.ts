// Crear aprobación
export const createAprobacion = async (aprobacion) => {
  const { data, error } = await supabase
    .from("aprobaciones")
    .insert([aprobacion])
    .select();
  if (error) throw error;
  return data;
};

// Obtener aprobaciones por muestra
export const fetchAprobacionesByMuestra = async (muestraId: string) => {
  const { data, error } = await supabase
    .from("aprobaciones")
    .select("*")
    .eq("muestra_id", muestraId)
    .order("fecha_aprobacion", { ascending: false });
  if (error) throw error;
  return data;
};

// Obtener aprobaciones por etapa de producción
export const fetchAprobacionesByEtapa = async (lineaId: string, etapa: string) => {
  const { data, error } = await supabase
    .from("aprobaciones")
    .select("*")
    .eq("tipo_aprobacion", "produccion")
    .eq("etapa", etapa)
    .eq("muestra_id", lineaId) // si decides usar linea_id en lugar de muestra_id
    .order("fecha_aprobacion", { ascending: false });
  if (error) throw error;
  return data;
};
