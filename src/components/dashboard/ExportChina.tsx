"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExportChina({
  seasons,
  exportSeasons,
  toggleExportSeason,
  handleExportChina,
}: {
  seasons: string[];
  exportSeasons: string[];
  toggleExportSeason: (s: string) => void;
  handleExportChina: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar datos para China</CardTitle>
        <CardDescription>Selecciona temporadas para generar el Excel</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          {seasons.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={exportSeasons.includes(s)}
                onChange={() => toggleExportSeason(s)}
              />
              {s}
            </label>
          ))}
        </div>

        <Button onClick={handleExportChina}>Exportar Excel</Button>
      </CardContent>
    </Card>
  );
}
