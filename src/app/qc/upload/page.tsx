"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QCUploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setErrorMsg("");
    setResult(null);

    if (!file) {
      setErrorMsg("Selecciona un archivo primero.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/qc/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Error subiendo el archivo.");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error("QC upload error:", err);
      setErrorMsg(err.message || "Error inesperado subiendo el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* CABECERA + BOTONES NAVEGACIÓN */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Subir QC Inspection</h1>

          <div className="flex gap-2">
            {/* Volver atrás */}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              ← Volver
            </button>

            {/* Ir a inicio */}
            <Link
              href="/"
              className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-700 transition"
            >
              Ir a inicio
            </Link>
          </div>
        </div>

        <p className="text-gray-600">
          Sube el archivo Excel de inspección (plantilla QC) para guardar la inspección
          y sus defectos en el sistema.
        </p>

        {/* INPUT ARCHIVO */}
        <div className="space-y-3">
          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {loading ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>

        {/* ERRORES */}
        {errorMsg && (
          <div className="p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* RESULTADO */}
        {result && (
          <pre className="mt-4 bg-white border border-gray-200 rounded-lg p-4 text-sm overflow-auto">
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
