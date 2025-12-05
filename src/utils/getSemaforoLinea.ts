import { getEstadoMuestra } from "./getEstadoMuestra";

/**
 * Calcula el estado global de una línea de pedido basándose en las muestras.
 * Prioridad:
 * 1️⃣ Rechazado → rojo
 * 2️⃣ Pendiente → amarillo
 * 3️⃣ Todo Enviado/Aprobado → verde
 */
export function getSemaforoLinea(muestras: any[]) {
  if (!muestras || muestras.length === 0) {
    return { color: "gray", estado: "Sin muestras", icon: "⚪" };
  }

  let tieneRechazado = false;
  let tienePendiente = false;

  for (const m of muestras) {
    const estado = getEstadoMuestra({
      fecha_muestra: m.fecha_muestra,
      fecha_teorica: m.fecha_teorica,
      approval_text: m.notas,
    });

    if (estado === "Rechazado") tieneRechazado = true;
    if (estado === "Pendiente") tienePendiente = true;
  }

  if (tieneRechazado)
    return { color: "red", estado: "Problemas", icon: "🔴" };

  if (tienePendiente)
    return { color: "yellow", estado: "En proceso", icon: "🟡" };

  return { color: "green", estado: "OK", icon: "🟢" };
}
