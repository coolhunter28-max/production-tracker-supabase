"use client";

import { useState } from "react";
// importa tu helper real aquí (ajústalo si lo tienes en otra carpeta)
import { importCSV } from "@/services/import-csv"; 

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      // ⚠️ aquí podrías parsear para preview si quieres
      setPreviewData([]);
    }
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;

    setImporting(true);
    setProgress({ current: 0, total: 0, errors: 0 });
    setError(null);
    setSuccess(null);

    try {
      const result = await importCSV(file);
      setSuccess(result.message);
      setProgress({
        current: result.successCount || 0,
        total: result.count || 0,
        errors: result.errorCount || 0,
      });
    } catch (err: any) {
      console.error("Error durante la importación:", err);
      setError(
        `Error durante la importación: ${err.message || "Error desconocido"}`
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Importar datos</h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-4"
      />

      <button
        disabled={!file || importing}
        onClick={handleImport}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {importing ? "Importando..." : "Importar CSV"}
      </button>

      {progress.total > 0 && (
        <p className="mt-2 text-sm text-gray-700">
          Importados {progress.current} de {progress.total} con {progress.errors}{" "}
          errores.
        </p>
      )}

      {success && <p className="text-green-600 mt-2">{success}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
