"use client";

import React, { useEffect, useState } from "react";
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

  // 🔍 Log de lo que llega a este paso
  useEffect(() => {
    console.log("🔎 [ConfirmStep] groupedPOs:", groupedPOs);
    console.log("🔎 [ConfirmStep] compareResult:", compareResult);
  }, [groupedPOs, compareResult]);

  const handleImport = async () => {
    try {
      setImporting(true);

      console.log("📨 [ConfirmStep] Enviando a /api/import-csv:", {
        groupedPOs,
        compareResult,
      });

      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs, compareResult }),
      });

      const json = await res.json();

      console.log("📥 [ConfirmStep] Respuesta de /api/import-csv:", json);

      setImporting(false);
      setSummary(json);

      if (json.ok) onConfirm();
    } catch (err) {
      console.error("💥 [ConfirmStep] Error al llamar a /api/import-csv:", err);
      setImporting(false);
      alert("Error inesperado al importar. Revisa la consola.");
    }
  };

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-semibold">Confirmación de importación</h2>
      <p>
        Se importarán solo los <b>POs nuevos o modificados</b>.
      </p>

      <div className="text-gray-700">
        🟢 Nuevos: <b>{compareResult?.nuevos || 0}</b> | 🟠 Modificados:{" "}
        <b>{compareResult?.modificados || 0}</b> | ⚪ Sin cambios:{" "}
        <b>{compareResult?.sinCambios || 0}</b>
      </div>

      {summary && (
        <div className="mt-4 border-t pt-4 text-sm text-gray-700">
          <p>✅ Nuevos: {summary.nuevos}</p>
          <p>🔁 Actualizados: {summary.actualizados}</p>
          <p>
            🧩 Muestras insertadas/actualizadas: {summary.muestrasInsertadas}
          </p>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing}
          className="bg-green-600 text-white font-semibold hover:bg-green-700"
        >
          {importing ? "Importando..." : "Confirmar importación →"}
        </Button>
      </div>
    </div>
  );
}
