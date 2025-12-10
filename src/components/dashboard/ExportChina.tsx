"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ExportChinaProps = {
  seasons: string[];
};

export default function ExportChina({ seasons }: ExportChinaProps) {
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);

  // Al cargar o cambiar las seasons, marcamos todas por defecto
  useEffect(() => {
    if (seasons.length === 0) {
      setSelectedSeasons([]);
      return;
    }

    setSelectedSeasons((prev) => {
      // Si aún no había selección, seleccionamos todas
      if (prev.length === 0) return seasons;

      // Si ya había selección, limpiamos temporadas que hayan desaparecido
      return prev.filter((s) => seasons.includes(s));
    });
  }, [seasons]);

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season]
    );
  };

  const handleExport = () => {
    if (selectedSeasons.length === 0) {
      alert("Selecciona al menos una temporada para exportar.");
      return;
    }

    const qs = selectedSeasons.join(",");
    window.location.href = `/api/export-china?seasons=${encodeURIComponent(
      qs
    )}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar datos para China</CardTitle>
        <CardDescription>
          Selecciona las temporadas para generar el Excel de producción.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {seasons.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay temporadas disponibles para exportar.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              {seasons.map((season) => (
                <label
                  key={season}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedSeasons.includes(season)}
                    onChange={() => toggleSeason(season)}
                  />
                  <span>{season}</span>
                </label>
              ))}
            </div>

            <Button onClick={handleExport}>Exportar pedidos para China</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
