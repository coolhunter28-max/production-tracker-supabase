"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadStepProps {
  onNext: (file: File, content: string) => void;
}

export default function UploadStep({ onNext }: UploadStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text && text.length > 0) {
        console.log("✅ Archivo leído correctamente. Longitud:", text.length);
        setFileContent(text);
      } else {
        console.error("⚠️ El archivo está vacío o no se pudo leer.");
      }
    };
    reader.onerror = () => {
      console.error("❌ Error al leer el archivo CSV.");
    };
    reader.readAsText(file, "UTF-8"); // Aseguramos codificación correcta
  }

  function handleContinue() {
    if (!selectedFile) {
      alert("Por favor, selecciona un archivo CSV antes de continuar.");
      return;
    }

    if (!fileContent || fileContent.trim() === "") {
      alert("El archivo no se ha leído correctamente. Intenta cargarlo otra vez.");
      return;
    }

    console.log("🚀 Enviando archivo a Validar:", {
      name: selectedFile.name,
      size: selectedFile.size,
      contentLength: fileContent.length,
    });

    onNext(selectedFile, fileContent);
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <h2 className="text-2xl font-semibold mt-4">Subir archivo CSV</h2>
      <p className="text-gray-600 text-sm">
        Selecciona el archivo CSV que deseas importar. Asegúrate de que el formato coincida con el esperado.
      </p>

      {/* Selector de archivo */}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-green-400 transition cursor-pointer bg-gray-50">
        <Upload className="h-10 w-10 text-green-600 mb-3" />
        <span className="text-gray-700 font-medium">
          {selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}
        </span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      {/* Información del archivo */}
      {selectedFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-left">
          <p className="text-green-700 font-semibold mb-1">Archivo cargado:</p>
          <p>
            <span className="font-medium text-gray-800">{selectedFile.name}</span>
          </p>
          <p className="text-gray-600 text-xs">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      {/* Botón continuar */}
      <div className="pt-4">
        <Button
          onClick={handleContinue}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Continuar →
        </Button>
      </div>
    </div>
  );
}
