"use client";

import React, { useState } from "react";
import UploadStep from "@/components/import/UploadStep";
import ValidateStep from "@/components/import/ValidateStep";
import PreviewStep from "@/components/import/PreviewStep";
import ConfirmStep from "@/components/import/ConfirmStep";


export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState<string | undefined>();
  const [csvContent, setCsvContent] = useState<string>("");
  const [groupedPOs, setGroupedPOs] = useState<any[]>([]);

  // === Paso 1: Upload ===
  const handleFileUpload = (file: File, content: string) => {
    setFileName(file.name);
    setCsvContent(content);
    setStep(2);
  };

  // === Paso 2: Validate ===
  const handleValidated = (data: any[]) => {
    setGroupedPOs(data);
    setStep(3);
  };

  // === Paso 3: Preview ===
  const handlePreviewNext = () => {
    setStep(4);
  };

  // === Paso 4: Confirm ===
  const handleFinish = () => {
    // Podrías redirigir al dashboard o mostrar mensaje global
    alert("✅ Importación finalizada correctamente.");
    setStep(1);
    setFileName(undefined);
    setCsvContent("");
    setGroupedPOs([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-10">
      {/* === Progress Header === */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4 text-sm font-medium">
          {[
            { id: 1, name: "Upload" },
            { id: 2, name: "Validate" },
            { id: 3, name: "Preview" },
            { id: 4, name: "Confirm" },
          ].map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 flex items-center justify-center rounded-full border-2 ${
                  step === s.id
                    ? "bg-green-500 text-white border-green-500"
                    : step > s.id
                    ? "bg-green-100 text-green-700 border-green-400"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
              >
                {s.id}
              </div>
              <span
                className={`${
                  step === s.id
                    ? "text-green-700 font-semibold"
                    : "text-gray-500"
                }`}
              >
                {s.name}
              </span>
              {s.id < 4 && (
                <span className="w-6 border-t border-gray-300 opacity-60"></span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* === Step Content === */}
      {step === 1 && (
        <UploadStep
          onNext={handleFileUpload}
        />
      )}

      {step === 2 && (
        <ValidateStep
          csvContent={csvContent}
          onBack={() => setStep(1)}
          onNext={handleValidated}
        />
      )}

      {step === 3 && (
        <PreviewStep
          data={groupedPOs}
          onBack={() => setStep(2)}
          onNext={handlePreviewNext}
        />
      )}

      {step === 4 && (
        <ConfirmStep
          fileName={fileName}
          groupedPOs={groupedPOs}
          onBack={() => setStep(3)}
          onConfirm={handleFinish}
        />
      )}
    </div>
  );
}
