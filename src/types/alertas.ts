// src/types/alertas.ts
export interface Alerta {
  id: string;
  tipo: string;
  subtipo: string;
  severidad: string;
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

  // Campos extra para frontend
  po?: string;
  diasRestantes?: number;
}

export interface AlertaFiltro {
  leida?: boolean;
}
