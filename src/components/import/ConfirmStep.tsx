"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmStepProps {
  groupedPOs: any[];
  compareResult: any;
  onBack: () => void;
  onConfirm: () => void;
}

export default function ConfirmStep({
  groupedPOs,
  compareResult,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setSummary(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs, compareResult }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          json?.error === "Forbidden"
            ? "No tienes permisos para confirmar la importación. Solo ADMIN o MANAGER pueden ejecutar la carga final."
            : json?.error || "No se pudo completar la importación.";

        setErrorMessage(message);
        return;
      }

      setSummary(json);

      if (json.ok || json.mensaje) {
        setTimeout(() => {
          onConfirm();
        }, 2000);
      }
    } catch (err) {
      console.error("💥 Error al importar:", err);
      setErrorMessage("Error inesperado al importar. Consulta consola.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-semibold">Confirmación de importación</h2>

      <p>
        Se importarán los <b>POs nuevos, modificados y cancelaciones confirmadas</b>.
      </p>

      <div className="text-gray-700">
        🟢 Nuevos: <b>{compareResult?.nuevos || 0}</b> | 🟠 Modificados:{" "}
        <b>{compareResult?.modificados || 0}</b> | 🔴 Cancelados:{" "}
        <b>{compareResult?.cancelados || 0}</b> | ⚪ Sin cambios:{" "}
        <b>{compareResult?.sinCambios || 0}</b>
      </div>

      {errorMessage && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {summary && (
        <div className="mt-4 border-t pt-4 text-sm text-gray-700">
          <p>✅ Mensaje: {summary.mensaje || "Importación finalizada"}</p>
          <p>🟢 Procesados: {summary.ok ?? "-"}</p>
          <p>⚠️ Errores: {summary.errores ?? 0}</p>

          <p className="mt-2 font-semibold text-green-700">
            ✔ Importación finalizada correctamente
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Button onClick={onBack} variant="outline" disabled={importing}>
          ← Volver
        </Button>

        <Button
          onClick={handleImport}
          disabled={importing}
          className="bg-green-600 font-semibold text-white hover:bg-green-700"
        >
          {importing ? "Importando..." : "Confirmar importación →"}
        </Button>
      </div>
    </div>
  );
}