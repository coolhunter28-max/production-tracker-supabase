"use client";

import React, { useState } from "react";
import UploadStep from "@/components/import/UploadStep";
import ValidateStep from "@/components/import/ValidateStep";
import PreviewStep from "@/components/import/PreviewStep";
import ConfirmStep from "@/components/import/ConfirmStep";

export default function ImportPage() {
  // === Estados globales ===
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | undefined>();
  const [csvContent, setCsvContent] = useState<string>("");
  const [groupedPOs, setGroupedPOs] = useState<any[]>([]);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  // === Paso 1: Upload ===
  const handleFileUpload = (file: File, content: string) => {
    console.log("✅ Archivo recibido:", file.name);
    setSelectedFile(file);
    setFileName(file.name);
    setCsvContent(content);
    setStep(2);
  };

  // === Paso 2: Validate ===
  const handleValidated = (data: any[]) => {
    console.log("✅ Datos validados:", data.length, "filas");
    setGroupedPOs(data);
    setStep(3);
  };

  // === Paso 3: Preview ===
  const handlePreviewNext = (compareData?: any) => {
    if (compareData) setCompareResult(compareData);
    console.log("➡️ Avanzando a Confirmación");
    setStep(4);
  };

  // === Paso 4: Confirm ===
  const handleFinish = () => {
    alert("✅ Importación finalizada correctamente.");
    // 🔄 Reset completo del flujo
    setStep(1);
    setSelectedFile(null);
    setFileName(undefined);
    setCsvContent("");
    setGroupedPOs([]);
    setCompareResult(null);
  };

  return (
    <div className="relative max-w-6xl mx-auto p-8 space-y-10">
      {/* 🔙 Botón Volver al inicio */}
      <div className="absolute top-6 left-6 z-10">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 active:scale-[0.99] transition"
        >
          <span aria-hidden>←</span> Volver al inicio
        </a>
      </div>

      {/* === PROGRESS HEADER === */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4 text-sm font-medium">
          {[1, 2, 3, 4].map((i) => {
            const titles = ["Upload", "Validate", "Preview", "Confirm"];
            const name = titles[i - 1];
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 flex items-center justify-center rounded-full border-2 ${
                    step === i
                      ? "bg-green-500 text-white border-green-500"
                      : step > i
                      ? "bg-green-100 text-green-700 border-green-400"
                      : "bg-gray-100 text-gray-500 border-gray-300"
                  }`}
                >
                  {i}
                </div>
                <span
                  className={`${
                    step === i ? "text-green-700 font-semibold" : "text-gray-500"
                  }`}
                >
                  {name}
                </span>
                {i < 4 && (
                  <span className="w-6 border-t border-gray-300 opacity-60"></span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* === STEP CONTENT === */}
      {step === 1 && <UploadStep onNext={handleFileUpload} />}

      {step === 2 && (
        <ValidateStep
          file={selectedFile}
          content={csvContent}
          onBack={() => setStep(1)}
          onNext={handleValidated}
        />
      )}

      {step === 3 && (
  <PreviewStep
    data={groupedPOs}
    onBack={() => setStep(2)}
    onNextWithCompare={handlePreviewNext}  // 👈 esta es la clave
  />
)}


      {step === 4 && (
        <ConfirmStep
          fileName={fileName}
          groupedPOs={groupedPOs}
          compareResult={compareResult}
          onBack={() => setStep(3)}
          onConfirm={handleFinish}
        />
      )}
    </div>
  );
}
