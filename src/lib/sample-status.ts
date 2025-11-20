/src/lib/sample-status.ts

export type EstadoMuestra = "Pendiente" | "Enviado" | "Aprobado" | "Rechazado";

interface RawSampleData {
  fecha?: string | null;        // Fecha de CFMS o PPS
  aprobacion?: string | null;   // Cfm / N/Cfm / vacío
  notas?: string | null;        // Por si en algún csv viene "Confirmada"
}

export function deriveSampleStatus(sample: RawSampleData): EstadoMuestra {
  const fecha = sample.fecha?.trim() ?? "";
  const aprob = sample.aprobacion?.toLowerCase().replace(/\s+/g, "") ?? "";
  const notas = sample.notas?.toLowerCase() ?? "";

  // 1) Validación explícita: Cfm → Aprobado
  if (aprob === "cfm") return "Aprobado";

  // 2) Validación explícita: N/Cfm → Rechazado
  if (aprob === "n/cfm" || aprob === "ncfm" || aprob === "n/cfms" || aprob === "ncfms") {
    return "Rechazado";
  }

  // 3) Notas que indiquen confirmación
  if (notas.includes("confirmada") || notas.includes("confirmed")) {
    return "Aprobado";
  }

  // 4) Si tiene fecha pero no aprobación → Enviado
  if (fecha.length > 0) return "Enviado";

  // 5) Por defecto
  return "Pendiente";
}
