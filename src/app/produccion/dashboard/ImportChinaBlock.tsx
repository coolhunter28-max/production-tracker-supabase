"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ImportChinaBlock({
  chinaFile,
  onFileChange,
  onImport,
  importing,
  message,
}: {
  chinaFile: File | null;
  onFileChange: (e: any) => void;
  onImport: () => void;
  importing: boolean;
  message: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar datos desde China</CardTitle>
        <CardDescription>
          Sube el archivo Excel con fechas actualizadas de muestras, producción y logística.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Input type="file" accept=".xlsx" onChange={onFileChange} />

        <Button onClick={onImport} disabled={importing || !chinaFile}>
          {importing ? "Importando..." : "Importar archivo de China"}
        </Button>

        {message && (
          <pre className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border">
            {message}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
