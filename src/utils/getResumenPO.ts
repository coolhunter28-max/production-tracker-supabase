import { getEstadoMuestra } from "./getEstadoMuestra";

export function getResumenPO(lineas: any[]) {
  let ok = 0;
  let enProceso = 0;
  let problemas = 0;

  for (const l of lineas) {
    if (!l.muestras || l.muestras.length === 0) continue;

    let tieneRechazado = false;
    let tienePendiente = false;

    for (const m of l.muestras) {
      const estado = getEstadoMuestra({
        fecha_muestra: m.fecha_muestra,
        fecha_teorica: m.fecha_teorica,
        approval_text: m.notas,
      });

      if (estado === "Rechazado") tieneRechazado = true;
      if (estado === "Pendiente") tienePendiente = true;
    }

    if (tieneRechazado) problemas++;
    else if (tienePendiente) enProceso++;
    else ok++;
  }

  return { ok, enProceso, problemas };
}
