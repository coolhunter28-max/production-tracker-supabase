"use client";

import { useState, useEffect } from "react";
import { fetchPOs } from "@/services/pos";
import ExportChina from "@/components/dashboard/ExportChina";

export default function ExportPage() {
  const [seasons, setSeasons] = useState<string[]>([]);

  useEffect(() => {
    const loadSeasons = async () => {
      const pos = await fetchPOs();
      const unique = [...new Set(pos.map((p: any) => p.season).filter(Boolean))].sort();
      setSeasons(unique);
    };
    loadSeasons();
  }, []);

  return (
    <div className="container mx-auto py-10 space-y-10">

      <h1 className="text-3xl font-bold">Exportación China</h1>
      <p className="text-gray-600">
        Selecciona las temporadas para exportar el archivo Excel de producción.
      </p>

      <div className="bg-white shadow p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Exportar datos para China</h2>
        <ExportChina seasons={seasons} />
      </div>

      <button
        onClick={() => window.history.back()}
        className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        ← Volver
      </button>

    </div>
  );
}
