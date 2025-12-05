"use client";

import { useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";

export default function ExportChinaPage() {
  const [season, setSeason] = useState("FW25");
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleExport = async () => {
    setDownloading(true);
    setMsg("");

    try {
const res = await fetch(`/api/export-china?seasons=${season}`);

      if (!res.ok) {
        setMsg("Error realizando exportación.");
        setDownloading(false);
        return;
      }

      // Descargar el archivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `EXPORT_CHINA_${season}.xlsx`;
      a.click();

      setMsg("Exportación completada.");
    } catch (e) {
      console.error(e);
      setMsg("Error inesperado.");
    }

    setDownloading(false);
  };

  return (
    <ImportExportLayout
      title="Export China – Archivo de Producción"
      subtitle="Genera el archivo Excel necesario para enviarlo a China con la información actualizada."
    >
      <div className="flex flex-col gap-6">

        {/* Selector de season */}
        <div className="flex flex-col">
          <label className="font-medium mb-1">Selecciona Season:</label>
          <select
            className="border p-3 rounded-lg"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option>FW25</option>
            <option>SS25</option>
            <option>FW24</option>
            <option>SS24</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
        >
          {downloading ? "Generando archivo..." : "Exportar Excel para China"}
        </button>

        {msg && (
          <p className="p-3 bg-green-100 border-green-300 border rounded-lg text-green-800">
            {msg}
          </p>
        )}
      </div>
    </ImportExportLayout>
  );
}
