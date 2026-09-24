"use client";

import { Printer } from "lucide-react";

export function PrintAnalysisButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-semibold transition hover:bg-slate-50 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Imprimir / Guardar PDF
    </button>
  );
}
