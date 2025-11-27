'use client';

export default function Stepper({ steps, currentStep }: { steps: any[]; currentStep: number }) {
  return (
    <div className="flex justify-center gap-4">
      {steps.map((s) => (
        <div key={s.number} className="flex flex-col items-center">
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
              s.number === currentStep ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.number}
          </div>
          <span className="text-xs mt-1">{s.title}</span>
        </div>
      ))}
    </div>
  );
}
