// src/types/alertas.ts
export interface AlertaConfig {
  tipo: 'muestra' | 'etd' | 'produccion';
  subtipo: string;
  diasAntelacion: number;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface Alerta {
  id: string;
  tipo: 'muestra' | 'etd' | 'produccion';
  subtipo: string;
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  fecha: string;
  esEstimada: boolean;
  po: string;
  lineaId: string;
  diasRestantes: number;
  leida: boolean;
}

export const TIPOS_ALERTAS: AlertaConfig[] = [
  // Alertas de muestras
  { tipo: 'muestra', subtipo: 'CFMs', diasAntelacion: 25, prioridad: 'media' },
  { tipo: 'muestra', subtipo: 'Counter Sample', diasAntelacion: 10, prioridad: 'alta' },
  { tipo: 'muestra', subtipo: 'Fitting Sample', diasAntelacion: 45, prioridad: 'baja' },
  { tipo: 'muestra', subtipo: 'PPS', diasAntelacion: 25, prioridad: 'media' },
  { tipo: 'muestra', subtipo: 'Testing Samples', diasAntelacion: 14, prioridad: 'alta' },
  
  // Alertas de ETD
  { tipo: 'etd', subtipo: 'Shipping Date', diasAntelacion: 15, prioridad: 'alta' },
  { tipo: 'etd', subtipo: 'Finish Date', diasAntelacion: 15, prioridad: 'alta' },
  { tipo: 'etd', subtipo: 'ETD PI', diasAntelacion: 15, prioridad: 'media' },
  
  // Alertas de producción
  { tipo: 'produccion', subtipo: 'Trial Upper', diasAntelacion: 10, prioridad: 'alta' },
  { tipo: 'produccion', subtipo: 'Trial Lasting', diasAntelacion: 9, prioridad: 'alta' },
  { tipo: 'produccion', subtipo: 'Lasting', diasAntelacion: 11, prioridad: 'alta' },
  { tipo: 'produccion', subtipo: 'Inspection', diasAntelacion: 1, prioridad: 'alta' },
];