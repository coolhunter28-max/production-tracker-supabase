// src/types/index.ts
export interface PO {
  id: string;
  po: string;
  supplier: string;
  season: string;
  customer: string;
  factory: string;
  po_date?: string;
  etd_pi?: string;
  pi?: string;
  channel?: string;
  booking?: string;
  closing?: string;
  shipping_date?: string;
  created_at: string;
  updated_at: string;
}

export interface LineaPedido {
  id: string;
  po_id?: string;
  reference?: string;
  style: string;
  color: string;
  size_run?: string;
  qty: number;
  category?: string;
  price?: number;
  amount?: number;
  pi_bsg?: string;
  price_selling?: number;
  amount_selling?: number;
  trial_upper?: string;
  trial_lasting?: string;
  lasting?: string;
  finish_date?: string;
  etd?: string;
  inspection?: string;
  created_at: string;
  updated_at: string;
}

export interface Muestra {
  id: string;
  linea_pedido_id?: string;
  tipo_muestra: string;
  round: number; // Es número, no texto como esperábamos
  fecha_muestra?: string;
  estado_muestra: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface Alerta {
  id: string;
  tipo: 'muestra' | 'etd' | 'produccion';
  subtipo: string;
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  fecha: string;
  fecha_limite: string;
  es_estimada: boolean;
  po_id: string;
  linea_id: string;
  muestra_id?: string;
  leida: boolean;
  created_at: string;
  updated_at: string;
}