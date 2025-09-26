// src/services/pos.ts
import { supabase } from '@/lib/supabase';
import { PO } from '@/types';

export const fetchPOs = async () => {
  const { data, error } = await supabase
    .from('pos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as PO[];
};

export const fetchPOById = async (id: string) => {
  const { data, error } = await supabase
    .from('pos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as PO;
};

export const createPO = async (po: Omit<PO, 'id' | 'created_at' | 'updated_at'>) => {
  // Procesar los datos antes de enviarlos a la base de datos
  const processedPO = {
    po: po.po,
    supplier: po.supplier,
    season: po.season,
    customer: po.customer,
    factory: po.factory,
    po_date: po.po_date || null,  // Convertir cadena vacía a null
    etd_pi: po.etd_pi || null,      // Convertir cadena vacía a null
    pi: po.pi || null,              // Convertir cadena vacía a null
    channel: po.channel || null,     // Convertir cadena vacía a null
    booking: po.booking || null,     // Convertir cadena vacía a null
    closing: po.closing || null,     // Convertir cadena vacía a null
    shipping_date: po.shipping_date || null  // Convertir cadena vacía a null
  };
  
  const { data, error } = await supabase
    .from('pos')
    .insert([processedPO])
    .select()
    .single();
  
  if (error) throw error;
  return data as PO;
};

export const updatePO = async (id: string, updates: Partial<PO>) => {
  console.log('updatePO llamado con:', updates); // Debug
  
  // Procesar los datos antes de enviarlos a la base de datos
  const processedUpdates: any = {};
  
  // Solo incluir campos que no sean cadenas vacías
  if (updates.po !== undefined) processedUpdates.po = updates.po;
  if (updates.supplier !== undefined) processedUpdates.supplier = updates.supplier;
  if (updates.season !== undefined) processedUpdates.season = updates.season;
  if (updates.customer !== undefined) processedUpdates.customer = updates.customer;
  if (updates.factory !== undefined) processedUpdates.factory = updates.factory;
  
  // Manejar campos de fecha
  if (updates.po_date !== undefined) processedUpdates.po_date = updates.po_date || null;
  if (updates.etd_pi !== undefined) processedUpdates.etd_pi = updates.etd_pi || null;
  if (updates.shipping_date !== undefined) processedUpdates.shipping_date = updates.shipping_date || null;
  
  // Manejar otros campos opcionales
  if (updates.pi !== undefined) processedUpdates.pi = updates.pi || null;
  if (updates.channel !== undefined) processedUpdates.channel = updates.channel || null;
  if (updates.booking !== undefined) processedUpdates.booking = updates.booking || null;
  if (updates.closing !== undefined) processedUpdates.closing = updates.closing || null;
  
  console.log('Datos procesados para actualizar:', processedUpdates); // Debug
  
  const { data, error } = await supabase
    .from('pos')
    .update(processedUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error en Supabase update:', error); // Debug
    throw error;
  }
  
  return data as PO;
};

export const deletePO = async (id: string) => {
  const { error } = await supabase
    .from('pos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};