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
        console.log("📄 Archivo leído correctamente, caracteres:", text.length);
        setFileContent(text);
      } else {
        console.error("⚠ El archivo está vacío o no se pudo leer.");
      }
    };

    reader.onerror = () => {
      console.error("❌ Error al leer el archivo CSV.");
    };

    reader.readAsText(file, "UTF-8");
  }

  function handleContinue() {
    if (!selectedFile) {
      alert("Por favor selecciona un archivo CSV.");
      return;
    }

    if (!fileContent || fileContent.trim() === "") {
      alert("Error al leer el archivo. Reintenta subirlo.");
      return;
    }

    console.log("➡ PASO 1 OK. Enviando a ValidateStep:", {
      file: selectedFile.name,
      chars: fileContent.length,
    });

    onNext(selectedFile, fileContent);
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <h2 className="text-2xl font-semibold mt-4">Subir archivo CSV</h2>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-green-400 transition cursor-pointer bg-gray-50">
        <Upload className="h-10 w-10 text-green-600 mb-3" />
        <span className="text-gray-700 font-medium">
          {selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}
        </span>
        <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
      </label>

      {selectedFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-left">
          <p className="text-green-700 font-semibold mb-1">Archivo cargado:</p>
          <p><strong>{selectedFile.name}</strong></p>
          <p className="text-gray-600 text-xs">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      <Button
        onClick={handleContinue}
        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
      >
        Continuar →
      </Button>
    </div>
  );
}
