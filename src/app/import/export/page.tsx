"use client";

import { useEffect, useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function ExportChinaPage() {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const loadSeasons = async () => {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase
        .from("pos")
        .select("season")
        .order("season", { ascending: false });

      if (error) {
        console.error("Error loading seasons:", error);
        return;
      }

      const unique = Array.from(
        new Set(
          (data ?? [])
            .map((row) => row.season)
            .filter((season): season is string => Boolean(season && season.trim() !== ""))
        )
      );

      setSeasons(unique);
    };

    loadSeasons();
  }, []);

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
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

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `EXPORT_CHINA_${seasonParam}.xlsx`;
      a.click();

      window.URL.revokeObjectURL(url);

      setMsg("Exportación completada.");
    } catch (error) {
      console.error(error);
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
        <div className="flex flex-col">
          <label className="mb-1 font-medium">Selecciona Season(s):</label>

          <select
            multiple
            className="h-40 rounded-lg border p-3"
            onChange={handleSelect}
          >
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>

          <small className="mt-1 text-gray-500">
            * Pulsa CTRL para seleccionar varias
          </small>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={downloading}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {downloading ? "Generando archivo..." : "Exportar Excel para China"}
        </button>

        {msg ? (
          <p className="rounded-lg border border-green-300 bg-green-100 p-3 text-green-800">
            {msg}
          </p>
        ) : null}
      </div>
    </ImportExportLayout>
  );
}