// src/services/muestras.ts
import { supabase } from '@/lib/supabase';
import { Muestra } from '@/types';

/**
 * 🔹 Obtener muestras de una línea
 */
export const fetchMuestrasByLineaId = async (lineaId: string) => {
  const { data, error } = await supabase
    .from('muestras')
    .select('*')
    .eq('linea_pedido_id', lineaId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Muestra[];
};

/**
 * 🔹 Crear una nueva muestra
 */
export const createMuestra = async (
  muestra: Omit<Muestra, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('muestras')
    .insert([muestra])
    .select()
    .single();

  if (error) throw error;
  return data as Muestra;
};

/**
 * 🔹 Obtener una muestra por ID
 */
export const getMuestraById = async (id: string | number) => {
  const { data, error } = await supabase
    .from('muestras')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Muestra;
};

/**
 * 🔹 Actualizar una muestra
 */
export const updateMuestra = async (
  id: string | number,
  updates: Partial<Muestra>
) => {
  const { data, error } = await supabase
    .from('muestras')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Muestra;
};

/**
 * 🔹 Eliminar una muestra
 */
export const deleteMuestra = async (id: string | number) => {
  const { error } = await supabase.from('muestras').delete().eq('id', id);

  if (error) throw error;
  return true;
};
