"use client";

import ImportExportLayout from "@/components/layout/ImportExportLayout";
import UploadStep from "@/components/import/UploadStep";
import ValidateStep from "@/components/import/ValidateStep";
import PreviewStep from "@/components/import/PreviewStep";
import ConfirmStep from "@/components/import/ConfirmStep";
import Stepper from "@/components/import/Stepper";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportSpainPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  // 🔥 Aquí guardamos el estado de cada fase
  const [data, setData] = useState<any>(null);

  // 🔥 Resultado de compare-csv
  const [compareResult, setCompareResult] = useState<any>(null);

  return (
    <ImportExportLayout
      title="Import Spain – CSV de Producción"
      subtitle="Wizard de 4 pasos para importar los datos de producción desde España."
    >
      {/* PASOS */}
      <Stepper
        steps={[
          { number: 1, title: "Upload" },
          { number: 2, title: "Validate" },
          { number: 3, title: "Preview" },
          { number: 4, title: "Confirm" },
        ]}
        currentStep={step}
      />

      {/* 1️⃣ UPLOAD */}
      {step === 1 && (
        <UploadStep
          onNext={(file, content) => {
            console.log("📌 Paso 1 → Guardamos:", { file, content });
            setData({ file, content }); // Este es el shape CORRECTO
            setStep(2);
          }}
        />
      )}

      {/* 2️⃣ VALIDATE */}
      {step === 2 && data && (
        <ValidateStep
          file={data.file}
          content={data.content}
          onBack={() => setStep(1)}
          onNext={(groupedPOs) => {
            console.log("📌 Grupo generado:", groupedPOs);
            setData(groupedPOs);    // Ahora data pasa a ser groupedPOs
            setStep(3);
          }}
        />
      )}

      {/* 3️⃣ PREVIEW + compare-csv */}
      {step === 3 && data && (
        <PreviewStep
          data={data}
          onBack={() => setStep(2)}
          onNextWithCompare={(result) => {
            console.log("📌 Resultado compare-csv:", result);
            setCompareResult(result);
            setStep(4);
          }}
        />
      )}

      {/* 4️⃣ CONFIRM */}
      {step === 4 && (
        <ConfirmStep
          groupedPOs={data}            // 🔥 PO group enviados correctamente
          compareResult={compareResult} // 🔥 compare enviado correctamente
          onBack={() => setStep(3)}
          onConfirm={() => router.push("/import")}
        />
      )}
    </ImportExportLayout>
  );
}
