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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setSelectedFile(f);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setFileContent(content);
      console.log("📂 Archivo leído correctamente:", f.name);
      console.log("📄 Primeros 200 caracteres:", content.slice(0, 200));
    };
    reader.readAsText(f);
  };

  const handleContinue = () => {
    if (!selectedFile) {
      alert("Por favor, selecciona un archivo CSV antes de continuar.");
      return;
    }

    if (!fileContent || fileContent.trim() === "") {
      alert("El archivo todavía no se ha leído completamente. Espera un segundo y vuelve a intentar.");
      return;
    }

    console.log("➡️ Pasando archivo al paso 2:", selectedFile.name);
    onNext(selectedFile, fileContent);
  };

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
