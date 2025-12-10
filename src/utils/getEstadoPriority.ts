export function getEstadoPOPriority(estado: string): number {
  const e = estado.toLowerCase();

  if (e.includes("delay")) return 1;
  if (e.includes("producción")) return 2;
  if (e.includes("finalizado")) return 3;
  return 4; // sin datos
}
