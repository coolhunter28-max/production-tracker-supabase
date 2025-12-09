"use client";

import { useEffect, useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";
import { supabase } from "@/lib/supabase";

export default function ExportChinaPage() {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");

  // 🔥 CARGAR SEASONS REALES DESDE LA BBDD
  useEffect(() => {
    const loadSeasons = async () => {
      const { data, error } = await supabase
        .from("pos")
        .select("season")
        .order("season", { ascending: false });

      if (error) {
        console.error("Error loading seasons:", error);
        return;
      }

      const unique = Array.from(new Set(data.map((x) => x.season))).filter(
        (x) => x && x.trim() !== ""
      );

      setSeasons(unique);
    };

    loadSeasons();
  }, []);

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(
      event.target.selectedOptions,
      (opt) => opt.value
    );
    setSelectedSeasons(values);
  };

  const handleExport = async () => {
    if (selectedSeasons.length === 0) {
      setMsg("Selecciona al menos una season.");
      return;
    }

    setDownloading(true);
    setMsg("");

    try {
      const seasonParam = selectedSeasons.join(",");

      const res = await fetch(`/api/export-china?seasons=${seasonParam}`);

      if (!res.ok) {
        setMsg("Error realizando exportación.");
        setDownloading(false);
        return;
      }

      // Descargar archivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `EXPORT_CHINA_${seasonParam}.xlsx`;
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

        {/* Selector de seasons dinámicas */}
        <div className="flex flex-col">
          <label className="font-medium mb-1">Selecciona Season(s):</label>

          <select
            multiple
            className="border p-3 rounded-lg h-40"
            onChange={handleSelect}
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <small className="text-gray-500 mt-1">
            * Pulsa CTRL para seleccionar varias
          </small>
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
