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
    try {
      console.log("🧩 Iniciando validación del CSV...");
      if (!file) {
        alert("⚠️ No se ha seleccionado ningún archivo CSV.");
        return;
      }

      if (!content || content.trim().length === 0) {
        alert("⚠️ El contenido del archivo está vacío o no se cargó correctamente.");
        console.error("Archivo vacío o FileReader no terminó de cargar.");
        return;
      }

      // 1️⃣ Parsear CSV con PapaParse
      const parsed = parseCSVText(content);
      console.log("📄 Filas parseadas:", parsed.length);

      if (!parsed || parsed.length === 0) {
        alert("⚠️ Error al procesar el CSV. Revisa las cabeceras o el formato.");
        console.error("No se obtuvieron filas válidas del CSV:", parsed);
        return;
      }

      // 2️⃣ Agrupar por PO
      const grouped = groupRowsByPO(parsed);
      console.log("📦 Pedidos agrupados detectados:", grouped.length);

      if (!grouped || grouped.length === 0) {
        alert("⚠️ No se detectaron pedidos válidos en el archivo.");
        return;
      }

      // ✅ OK
      console.log("✅ CSV validado correctamente:", grouped.slice(0, 2));
      onNext(grouped);
    } catch (error) {
      console.error("❌ Error al validar CSV:", error);
      alert("❌ Error inesperado al procesar el CSV. Verifica el formato del archivo.");
    }
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
            Tamaño: {(file.size / 1024).toFixed(1)} KB
          </p>
        </>
      ) : (
        <p className="italic text-gray-500 mb-4">(Ningún archivo seleccionado)</p>
      )}

      <p className="italic text-gray-500 mb-6">
        (El archivo se verificará para confirmar que las cabeceras y el formato sean correctos.)
      </p>

      <div className="flex justify-center gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="border-gray-400 text-gray-700"
        >
          ← Volver
        </Button>

        <Button
          onClick={handleValidate}
          disabled={!file}
          className={`px-4 py-2 rounded text-white font-semibold ${
            file
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Validar archivo →
        </Button>
      </div>
    </div>
  );
}
