"use client";

import EditarPOPage from "../../[id]/editar/page";

export default function NuevoPOEditarWrapper() {
  // Reutiliza exactamente el mismo editor de /po/[id]/editar
  // pero entrando por /po/nuevo/editar
  return <EditarPOPage />;
}
