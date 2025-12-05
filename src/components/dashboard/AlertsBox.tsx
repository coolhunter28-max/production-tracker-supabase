"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import AlertasDashboard from "@/components/alertas/AlertasDashboard";

export default function AlertsBox() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleGenerarAlertas = async () => {
    try {
      setLoading(true);
      setMensaje("Generando alertas…");

      const res = await fetch("/api/generar-alertas", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setMensaje(data.message || "Alertas generadas.");
      } else {
        setMensaje(data.error || "Error generando alertas.");
      }
    } catch (err) {
      console.error("Error:", err);
      setMensaje("Error de red generando alertas.");
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sistema de Alertas</h2>

        <Button onClick={handleGenerarAlertas} disabled={loading}>
          {loading ? "Generando..." : "Generar alertas"}
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

      <AlertasDashboard />
    </div>
  );
}
