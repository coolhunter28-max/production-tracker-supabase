export function getEstadoMuestra({
  fecha_muestra,
  fecha_teorica,
  approval_text,
}: {
  fecha_muestra: string | null;
  fecha_teorica: string | null;
  approval_text?: string | null;
}) {
  // 1. Interpretar aprobaciones (igual que backend)
  const interpretApproval = (raw?: string | null) => {
    if (!raw) return null;
    const s = raw.trim().toLowerCase();
    if (["cfm", "confirmed", "confirmada", "ok"].includes(s)) {
      return "confirmada";
    }
    if (["n/cfm", "n/c", "no confirmada", "not confirmed"].includes(s)) {
      return "no_confirmada";
    }
    return null;
  };

  const approval = interpretApproval(approval_text);

  if (approval === "confirmada") return "Aprobado";
  if (approval === "no_confirmada") return "Rechazado";

  // 2. Reproducir calcEstado del importador
  if (!fecha_muestra) return "Pendiente";

  const real = new Date(fecha_muestra + "T00:00:00");
  if (isNaN(real.getTime())) return "Pendiente";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha real pasada/hoy → ENVIADO
  if (real.getTime() <= hoy.getTime()) {
    return "Enviado";
  }

  // Fecha real en el FUTURO → Pendiente
  return "Pendiente";
}
