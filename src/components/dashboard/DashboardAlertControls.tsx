"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardAlertControls() {
  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState("");

  // -----------------------------------------------------
  // Cargar contador de alertas no leídas
  // -----------------------------------------------------
  useEffect(() => {
    const cargarContadorAlertas = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.success) {
          setAlertasNoLeidasCount(data.alertas.length);
        } else if (Array.isArray(data)) {
          setAlertasNoLeidasCount(data.filter((a: any) => !a.leida).length);
        }
      } catch (error) {
        console.error("Error cargando contador de alertas:", error);
      }
    };
    cargarContadorAlertas();
  }, []);

  // -----------------------------------------------------
  // Generar alertas
  // -----------------------------------------------------
  const handleGenerarAlertas = async () => {
    setGenerandoAlertas(true);
    setMensajeAlertas("");

    try {
      const res = await fetch("/api/generar-alertas", { method: "POST" });
      const data = await res.json();

      if (data?.success) {
        setMensajeAlertas(data.message || "Alertas generadas correctamente.");

        const noLeidas = (data.alertas || []).filter((a: any) => !a.leida);
        setAlertasNoLeidasCount(noLeidas.length);
      } else {
        setMensajeAlertas(data?.message || "Error al generar alertas.");
      }
    } catch {
      setMensajeAlertas("Error de red al generar alertas.");
    } finally {
      setGenerandoAlertas(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sistema de Alertas</h2>

        <Button
          onClick={handleGenerarAlertas}
          disabled={generandoAlertas}
          variant="outline"
        >
          {generandoAlertas ? "Generando..." : "Generar alertas"}
        </Button>
      </div>

      {/* Mensaje */}
      {mensajeAlertas && (
        <div
          className={`p-3 rounded-md ${
            mensajeAlertas.includes("Error")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {mensajeAlertas}
        </div>
      )}

      {/* Contador de alertas no leídas */}
      {alertasNoLeidasCount > 0 && (
        <p className="text-sm text-gray-600">
          Alertas sin leer:{" "}
          <span className="font-semibold">{alertasNoLeidasCount}</span>
        </p>
      )}
    </div>
  );
}
