"use client";

import ImportExportLayout from "@/components/layout/ImportExportLayout";
import UploadStep from "@/components/import/UploadStep";
import ValidateStep from "@/components/import/ValidateStep";
import PreviewStep from "@/components/import/PreviewStep";
import ConfirmStep from "@/components/import/ConfirmStep";
import Stepper from "@/components/import/Stepper";
import { useState } from "react";

export default function ImportSpainPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>(null);

  return (
    <ImportExportLayout
      title="Import Spain – CSV de Producción"
      subtitle="Wizard de 4 pasos para importar los datos de producción desde España."
    >
      <Stepper
        steps={[
          { number: 1, title: "Upload" },
          { number: 2, title: "Validate" },
          { number: 3, title: "Preview" },
          { number: 4, title: "Confirm" },
        ]}
        currentStep={step}
      />

      {step === 1 && (
        <UploadStep
          onNext={(d) => {
            setData(d);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <ValidateStep
          data={data}
          onBack={() => setStep(1)}
          onNext={(clean) => {
            setData(clean);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <PreviewStep
          data={data}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <ConfirmStep
          data={data}
          onBack={() => setStep(3)}
          onFinish={() => router.push("/import")}
        />
      )}
    </ImportExportLayout>
  );
}
