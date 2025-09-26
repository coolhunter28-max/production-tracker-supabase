// src/config/muestras-config.ts
export const MUESTRAS_OFFSETS = {
  CFM: 45,      // 45 días antes del ETD (ahora positivo)
  COUNTER: 30,  // 30 días antes del ETD
  FITTING: 60,  // 60 días antes del ETD
  PPS: 25,      // 25 días antes del ETD
  TESTING: 14,  // 14 días antes del ETD
} as const;

export type TipoMuestra = keyof typeof MUESTRAS_OFFSETS;