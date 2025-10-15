// src/services/pos.ts
import { supabase } from '@/lib/supabase';
import { PO } from '@/types';

// 🔹 Obtener todos los POs con líneas de pedido (para acceder a los estilos)
export const fetchPOs = async () => {
  const { data, error } = await supabase
    .from('pos')
    .select(`
      *,
      lineas_pedido (
        id,
        style
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 🔹 Aplanar los estilos de las líneas para facilitar el filtrado en el dashboard
  const processedData = data.map((po: any) => ({
    ...po,
    styles: po.lineas_pedido?.map((l: any) => l.style).filter(Boolean) || [],
  }));

  return processedData as PO[];
};

// 🔹 Obtener un PO por ID
export const fetchPOById = async (id: string) => {
  const { data, error } = await supabase
    .from('pos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as PO;
};

// 🔹 Crear un nuevo PO
export const createPO = async (po: Omit<PO, 'id' | 'created_at' | 'updated_at'>) => {
  const processedPO = {
    po: po.po,
    supplier: po.supplier,
    season: po.season,
    customer: po.customer,
    factory: po.factory,
    po_date: po.po_date || null,
    etd_pi: po.etd_pi || null,
    pi: po.pi || null,
    channel: po.channel || null,
    booking: po.booking || null,
    closing: po.closing || null,
    shipping_date: po.shipping_date || null,
  };

  const { data, error } = await supabase
    .from('pos')
    .insert([processedPO])
    .select()
    .single();

  if (error) throw error;
  return data as PO;
};

// 🔹 Actualizar un PO existente
export const updatePO = async (id: string, updates: Partial<PO>) => {
  console.log('updatePO llamado con:', updates);

  const processedUpdates: any = {};

  if (updates.po !== undefined) processedUpdates.po = updates.po;
  if (updates.supplier !== undefined) processedUpdates.supplier = updates.supplier;
  if (updates.season !== undefined) processedUpdates.season = updates.season;
  if (updates.customer !== undefined) processedUpdates.customer = updates.customer;
  if (updates.factory !== undefined) processedUpdates.factory = updates.factory;

  if (updates.po_date !== undefined) processedUpdates.po_date = updates.po_date || null;
  if (updates.etd_pi !== undefined) processedUpdates.etd_pi = updates.etd_pi || null;
  if (updates.shipping_date !== undefined) processedUpdates.shipping_date = updates.shipping_date || null;

  if (updates.pi !== undefined) processedUpdates.pi = updates.pi || null;
  if (updates.channel !== undefined) processedUpdates.channel = updates.channel || null;
  if (updates.booking !== undefined) processedUpdates.booking = updates.booking || null;
  if (updates.closing !== undefined) processedUpdates.closing = updates.closing || null;

  console.log('Datos procesados para actualizar:', processedUpdates);

  const { data, error } = await supabase
    .from('pos')
    .update(processedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error en Supabase update:', error);
    throw error;
  }

  return data as PO;
};

// 🔹 Eliminar un PO
export const deletePO = async (id: string) => {
  const { error } = await supabase
    .from('pos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
