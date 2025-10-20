// src/types/alertas.ts

export const TIPOS_ALERTAS = {
  MUESTRA: "MUESTRA",
  ETD: "ETD",
  PRODUCCION: "PRODUCCION",
} as const;

export type TipoAlerta = keyof typeof TIPOS_ALERTAS;

export const SEVERIDADES_ALERTAS = {
  ALTA: "ALTA",
  MEDIA: "MEDIA",
  BAJA: "BAJA",
} as const;

export type SeveridadAlerta = keyof typeof SEVERIDADES_ALERTAS;

export interface Alerta {
  id?: string;
  tipo: TipoAlerta;
  subtipo: string;
  mensaje: string;
  fecha_objetivo: string;
  dias_restantes: number;
  severidad: SeveridadAlerta;
  po_id?: string;
  linea_pedido_id?: string;
  muestra_id?: string;
  creada_el?: string;

  // ✅ Campos usados por el dashboard
  po?: string | null;
  diasRestantes?: number;

  // ✅ Nuevo campo: estado de lectura
  leida?: boolean;
}
