"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ImportChina({
  chinaFile,
  importingChina,
  importChinaMsg,
  handleChinaFileChange,
  handleImportChina,
}: {
  chinaFile: File | null;
  importingChina: boolean;
  importChinaMsg: string;
  handleChinaFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImportChina: () => Promise<string>; // 🔥 devuelve report
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  const handleImport = async () => {
    const report = await handleImportChina();
    if (report) {
      setReportText(report);
      setModalOpen(true);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-china-report.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* CARD principal */}
      <Card>
        <CardHeader>
          <CardTitle>Importar datos desde China</CardTitle>
          <CardDescription>Sube el Excel con fechas actualizadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".xlsx" onChange={handleChinaFileChange} />

          <Button onClick={handleImport} disabled={!chinaFile || importingChina}>
            {importingChina ? "Importando..." : "Importar archivo"}
          </Button>

          {importChinaMsg && (
            <pre className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">
              {importChinaMsg}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white w-full max-w-3xl p-6 rounded-lg shadow-xl space-y-4">
            <h2 className="text-xl font-bold">Reporte de cambios</h2>

            <pre className="text-sm whitespace-pre-wrap bg-gray-100 p-3 rounded max-h-[60vh] overflow-auto">
              {reportText}
            </pre>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={downloadTxt}>
                Descargar TXT
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
