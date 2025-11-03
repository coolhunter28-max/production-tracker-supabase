// src/components/import/ValidateStep.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { parseCSVText, groupRowsByPO, POGroup } from "@/lib/csv-utils";

export default function ValidateStep({
  csvContent,
  onNext,
  onBack,
}: {
  csvContent: string;
  onNext: (data: POGroup[]) => void;
  onBack: () => void;
}) {
  const handleValidate = () => {
    try {
      if (!csvContent || csvContent.trim() === "") {
        alert("⚠️ El archivo CSV está vacío o no se cargó correctamente.");
        return;
      }
      const rows = parseCSVText(csvContent);
      if (!rows.length) {
        alert("⚠️ El CSV no tiene filas válidas.");
        return;
      }
      const grouped = groupRowsByPO(rows);
      if (!grouped.length) {
        alert("⚠️ No se detectaron POs en el CSV (revisa la columna PO).");
        return;
      }
      onNext(grouped);
    } catch (err) {
      console.error("❌ Error al validar CSV:", err);
      alert("❌ Error al procesar el CSV. Revisa el formato de cabeceras.");
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-3">Validar archivo</h2>
      <p className="text-gray-500 mb-6">
        (El archivo se verificará para confirmar que las cabeceras y el formato sean correctos.)
      </p>

      <div className="flex justify-center gap-3">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>
        <Button onClick={handleValidate} className="bg-green-600 text-white hover:bg-green-700">
          Validar archivo →
        </Button>
      </div>
    </div>
  );
}
