"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { parseCSVText, groupRowsByPO } from "@/lib/csv-utils";

interface ValidateStepProps {
  file: File | null;
  content: string;
  onNext: (data: any[]) => void;
  onBack: () => void;
}

export default function ValidateStep({
  file,
  content,
  onNext,
  onBack,
}: ValidateStepProps) {
  
  const handleValidate = () => {
    console.log("🔍 VALIDATE: Recibido:", { file, contentLength: content?.length });

    if (!file) {
      alert("⚠ No se ha seleccionado ningún archivo.");
      return;
    }

    if (!content || content.trim().length === 0) {
      alert("⚠ El archivo no se ha leído correctamente.");
      return;
    }

    // Parseo CSV
    const parsed = parseCSVText(content);
    if (!parsed.length) {
      alert("⚠ No se pudieron leer filas del CSV.");
      return;
    }

    // Agrupar por PO
    const grouped = groupRowsByPO(parsed);
    if (!grouped.length) {
      alert("⚠ No se detectaron pedidos válidos en el archivo.");
      return;
    }

    console.log("✅ Validación OK → agrupados:", grouped.length);
    onNext(grouped);
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Validar archivo</h2>

      {file ? (
        <>
          <p className="mb-2 text-gray-700">
            Archivo seleccionado: <strong>{file.name}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </>
      ) : (
        <p className="italic text-gray-500 mb-4">(Ningún archivo seleccionado)</p>
      )}

      <div className="flex justify-center gap-4">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>

        <Button
          onClick={handleValidate}
          className="bg-green-600 text-white font-semibold hover:bg-green-700"
        >
          Validar archivo →
        </Button>
      </div>
    </div>
  );
}
