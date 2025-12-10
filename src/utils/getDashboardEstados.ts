import { getEstadoPO } from "./getEstadoPO";

export function getDashboardEstados(pos: any[]) {
  const counters = {
    delay: 0,
    produccion: 0,
    finalizado: 0,
    sinDatos: 0,
  };

  pos.forEach((po) => {
    const e = getEstadoPO(po).estado.toLowerCase();

    if (e.includes("delay")) counters.delay++;
    else if (e.includes("producción")) counters.produccion++;
    else if (e.includes("finalizado")) counters.finalizado++;
    else counters.sinDatos++;
  });

  return counters;
}
