// src/services/lineasPedido.ts
import { supabase } from '@/lib/supabase';
import { LineaPedido } from '@/types';

export const fetchLineasByPOId = async (poId: string) => {
  const { data, error } = await supabase
    .from('lineas_pedido')
    .select('*')
    .eq('po_id', poId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as LineaPedido[];
};

export const createLineaPedido = async (linea: Omit<LineaPedido, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('lineas_pedido')
    .insert([linea])
    .select(.select(`id,
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
  price_selling,
  amount_selling,
  trial_upper,
  trial_lasting,
  lasting,
  finish_date,
  created_at,
  updated_at
`)
    .single();
  
  if (error) throw error;
  return data as LineaPedido;
};

export const updateLineaPedido = async (id: string, updates: Partial<LineaPedido>) => {
  // Procesar los datos antes de enviarlos a la base de datos
  const processedUpdates: any = {};
  
  // Solo incluir campos que no sean cadenas vacías
  if (updates.reference !== undefined) processedUpdates.reference = updates.reference || null;
  if (updates.style !== undefined) processedUpdates.style = updates.style;
  if (updates.color !== undefined) processedUpdates.color = updates.color;
  if (updates.size_run !== undefined) processedUpdates.size_run = updates.size_run || null;
  if (updates.qty !== undefined) processedUpdates.qty = updates.qty;
  if (updates.category !== undefined) processedUpdates.category = updates.category || null;
  if (updates.price !== undefined) processedUpdates.price = updates.price || null;
  if (updates.amount !== undefined) processedUpdates.amount = updates.amount || null;
  if (updates.pi_bsg !== undefined) processedUpdates.pi_bsg = updates.pi_bsg || null;
  if (updates.price_selling !== undefined) processedUpdates.price_selling = updates.price_selling || null;
  if (updates.amount_selling !== undefined) processedUpdates.amount_selling = updates.amount_selling || null;
  if (updates.trial_upper !== undefined) processedUpdates.trial_upper = updates.trial_upper || null;
  if (updates.trial_lasting !== undefined) processedUpdates.trial_lasting = updates.trial_lasting || null;
  if (updates.lasting !== undefined) processedUpdates.lasting = updates.lasting || null;
  if (updates.finish_date !== undefined) processedUpdates.finish_date = updates.finish_date || null;
  
  const { data, error } = await supabase
    .from('lineas_pedido')
    .update(processedUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as LineaPedido;
};

export const deleteLineaPedido = async (id: string) => {
  const { error } = await supabase
    .from('lineas_pedido')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};