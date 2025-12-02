"use client";

import { useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AlertasDashboard from "@/components/alertas/AlertasDashboard";
import { Button } from "@/components/ui/button";

export default function PaginaAlertas() {
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleGenerarAlertas = async () => {
    try {
      setGenerandoAlertas(true);
      setMensaje("Generando alertas…");

      const res = await fetch("/api/generar-alertas", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setMensaje(data.message || "Alertas generadas correctamente.");
      } else {
        setMensaje(data.error || "Error generando alertas.");
      }
    } catch (error) {
      console.error("Error generando alertas:", error);
      setMensaje("Error de red al generar alertas.");
    } finally {
      setGenerandoAlertas(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* HEADER UNIFICADO */}
      <DashboardHeader />

      <div className="flex justify-between items-center mt-4">
        <h2 className="text-2xl font-bold">Sistema de Alertas</h2>
        <Button onClick={handleGenerarAlertas} disabled={generandoAlertas}>
          {generandoAlertas ? "Generando..." : "Generar alertas"}
        </Button>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-md border ${
            mensaje.toLowerCase().includes("error")
              ? "bg-red-50 text-red-700 border-red-300"
              : "bg-green-50 text-green-700 border-green-300"
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* TABLA DE ALERTAS UNIFICADA */}
      <AlertasDashboard />
    </div>
  );
}
