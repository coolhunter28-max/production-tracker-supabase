export function getColorFechaMuestra(fechaReal: string | null, fechaTeorica: string | null) {
  if (!fechaTeorica) return "text-gray-500"; // sin referencia teórica

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const teorica = new Date(fechaTeorica + "T00:00:00");

  if (fechaReal) {
    const real = new Date(fechaReal + "T00:00:00");

    // Llegó tarde
    if (real.getTime() > teorica.getTime()) {
      return "text-red-600 font-semibold";
    }

    // Llegó en tiempo
    return "text-green-600 font-semibold";
  }

  // Sin fecha real → pendiente, ¿pero en retraso?
  if (hoy.getTime() > teorica.getTime()) {
    return "text-red-600 font-semibold"; // ya debería haber llegado
  }

  return "text-yellow-600 font-semibold"; // aún estamos a tiempo
}
