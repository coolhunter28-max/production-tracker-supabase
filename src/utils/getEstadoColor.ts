export function getEstadoColor(estado: string) {
  switch (estado) {
    case "Aprobado":
      return "text-green-600 font-bold";
    case "Rechazado":
      return "text-red-600 font-bold";
    case "Enviado":
      return "text-blue-600 font-semibold";
    case "Pendiente":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

export function getEstadoIcon(estado: string) {
  switch (estado) {
    case "Aprobado":
      return "✔️";
    case "Rechazado":
      return "❌";
    case "Enviado":
      return "📤";
    case "Pendiente":
      return "⏳";
    default:
      return "•";
  }
}
