"use client";

import { useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";

export default function ImportChinaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleImport = async () => {
    if (!file) {
      alert("Selecciona un archivo primero");
      return;
    }

    setLoading(true);
    setMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import-china", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.status !== "ok") {
        setMsg(json.error || "Error en la importación.");
      } else {
        setMsg(
          `Importación completada:
• POs encontrados: ${json.pos_encontrados}
• Líneas actualizadas: ${json.lineas_actualizadas}
• Muestras actualizadas: ${json.muestras_actualizadas}
• Avisos: ${json.avisos.length}
• Errores: ${json.errores.length}`
        );
      }
    } catch (e) {
      console.error(e);
      setMsg("Error inesperado importando el archivo.");
    }

    setLoading(false);
  };

  return (
    <ImportExportLayout
      title="Import China – Archivo de Producción"
      subtitle="Sube el archivo Excel procedente de China para actualizar el estado de fabricación y muestras."
    >
      {/* Uploader */}
      <div className="flex flex-col gap-6">

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-3 rounded-lg"
        />

        <button
          onClick={handleImport}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
        >
          {loading ? "Importando..." : "Importar archivo"}
        </button>

        {msg && (
          <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap border">
            {msg}
          </pre>
        )}
      </div>
    </ImportExportLayout>
  );
}
