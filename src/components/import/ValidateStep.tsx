"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCSVText } from "@/lib/csv-utils";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ValidateStepProps {
  csvContent: string;
  onBack: () => void;
  onNext: (groupedData: any[]) => void;
}

export default function ValidateStep({ csvContent, onBack, onNext }: ValidateStepProps) {
  const [validationResult, setValidationResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleValidate() {
    try {
      setLoading(true);
      setError(null);
      setValidationResult([]);

      // Parseo y normalización
      const grouped = parseCSVText(csvContent);

      if (!grouped || grouped.length === 0) {
        throw new Error("El archivo no contiene datos válidos o está vacío.");
      }

      setValidationResult(grouped);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error durante la validación del archivo.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    if (validationResult.length > 0) {
      onNext(validationResult);
    } else {
      alert("Valida primero el archivo antes de continuar.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <h2 className="text-2xl font-semibold mt-4">Validar contenido del CSV</h2>
      <p className="text-gray-600 text-sm">
        Se verificará que el archivo tenga el formato correcto y que todos los campos requeridos estén presentes.
      </p>

      {/* === Botón de validación === */}
      {!validationResult.length && !error && !loading && (
        <Button
          onClick={handleValidate}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Iniciar validación
        </Button>
      )}

      {/* === Estado de carga === */}
      {loading && (
        <div className="py-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600 mb-3"></div>
          <p className="text-gray-700">Validando archivo CSV...</p>
        </div>
      )}

      {/* === Resultado correcto === */}
      {!loading && validationResult.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-green-700">
              Archivo validado correctamente
            </p>
          </div>
          <p className="text-gray-700 text-sm">
            Se detectaron <strong>{validationResult.length}</strong> pedidos (POs) listos para previsualizar.
          </p>
        </div>
      )}

      {/* === Error de validación === */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="font-semibold text-red-700">Error en la validación</p>
          </div>
          <p className="text-gray-700 text-sm">{error}</p>
        </div>
      )}

      {/* === Botones de navegación === */}
      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-green-600 text-white font-semibold hover:bg-green-700 transition"
        >
          Continuar →
        </Button>
      </div>
    </div>
  );
}
