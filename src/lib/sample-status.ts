export type EstadoMuestra =
  | "Pendiente"
  | "Enviado"
  | "Aprobado"
  | "Rechazado";

interface RawSampleData {
  fecha?: string | null;
  aprobacion?: string | null;
  notas?: string | null;
}

export function deriveSampleStatus(
  sample: RawSampleData
): EstadoMuestra {
  const fecha = sample.fecha?.trim() ?? "";
  const aprob =
    sample.aprobacion?.toLowerCase().replace(/\s+/g, "") ?? "";
  const notas = sample.notas?.toLowerCase() ?? "";

  if (aprob === "cfm") {
    return "Aprobado";
  }

  if (
    aprob === "n/cfm" ||
    aprob === "ncfm" ||
    aprob === "n/cfms" ||
    aprob === "ncfms"
  ) {
    return "Rechazado";
  }

  if (
    notas.includes("confirmada") ||
    notas.includes("confirmed")
  ) {
    return "Aprobado";
  }

  if (fecha.length > 0) {
    return "Enviado";
  }

  return "Pendiente";
}