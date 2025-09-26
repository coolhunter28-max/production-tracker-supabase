// src/config/alertas-config.ts

import { TIPOS_ALERTAS, SEVERIDADES_ALERTAS } from "@/types/alertas";

export interface ConfigAlerta {
  diasAntelacion: number;
  severidad: (dias: number) => keyof typeof SEVERIDADES_ALERTAS;
}

// Configuración de alertas por tipo y subtipo
export const ALERTAS_CONFIG: Record<
  string,
  Record<string, ConfigAlerta>
> = {
  [TIPOS_ALERTAS.MUESTRA]: {
    CFM: {
      diasAntelacion: 25,
      severidad: (dias) =>
        dias <= 3 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    COUNTER: {
      diasAntelacion: 10,
      severidad: (dias) =>
        dias <= 2 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    FITTING: {
      diasAntelacion: 45,
      severidad: (dias) =>
        dias <= 5 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    PPS: {
      diasAntelacion: 25,
      severidad: (dias) =>
        dias <= 3 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    TESTING: {
      diasAntelacion: 14,
      severidad: (dias) =>
        dias <= 2 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
  },

  [TIPOS_ALERTAS.ETD]: {
    SHIPPING_DATE: {
      diasAntelacion: 15,
      severidad: (dias) =>
        dias <= 3 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    FINISH_DATE: {
      diasAntelacion: 15,
      severidad: (dias) =>
        dias <= 3 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    ETD_PI: {
      diasAntelacion: 15,
      severidad: (dias) =>
        dias <= 3 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
  },

  [TIPOS_ALERTAS.PRODUCCION]: {
    TRIAL_UPPER: {
      diasAntelacion: 10,
      severidad: (dias) =>
        dias <= 2 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    TRIAL_LASTING: {
      diasAntelacion: 9,
      severidad: (dias) =>
        dias <= 2 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    LASTING: {
      diasAntelacion: 11,
      severidad: (dias) =>
        dias <= 2 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
    INSPECTION: {
      diasAntelacion: 1,
      severidad: (dias) =>
        dias <= 1 ? SEVERIDADES_ALERTAS.ALTA : SEVERIDADES_ALERTAS.MEDIA,
    },
  },
};