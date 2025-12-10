"use client";

import { useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";
import { Button } from "@/components/ui/button";

export default function ImportChinaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  // -------------------------------------------------------------
  // Descargar TXT
  // -------------------------------------------------------------
  const downloadTxt = () => {
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "import-china-report.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // Importar archivo
  // -------------------------------------------------------------
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

      const raw = await res.text(); // capturamos texto crudo

      let json: any = null;
      try {
        json = JSON.parse(raw);
      } catch {
        setMsg("Respuesta inválida del servidor:\n" + raw.slice(0, 400));
        return;
      }

      if (!res.ok || json.status !== "ok") {
        setMsg(json.error || "Error en la importación.");
        return;
      }

      // -------------------------------------------------------------
      // Construir reporte completo
      // -------------------------------------------------------------
      let report = "===== INFORME IMPORTACIÓN CHINA =====\n\n";

      report += `POs encontrados: ${json.pos_encontrados}\n`;
      report += `Líneas actualizadas: ${json.lineas_actualizadas}\n`;
      report += `Muestras actualizadas: ${json.muestras_actualizadas}\n`;
      report += `Avisos: ${json.avisos.length}\n`;
      report += `Errores: ${json.errores.length}\n\n`;

      if (json.detalles?.cambios?.length) {
        report += "=== CAMBIOS ===\n";
        for (const c of json.detalles.cambios) report += "• " + c + "\n";
        report += "\n";
      }

      if (json.avisos?.length) {
        report += "=== AVISOS ===\n";
        for (const a of json.avisos) report += "• " + a + "\n";
        report += "\n";
      }

      if (json.errores?.length) {
        report += "=== ERRORES ===\n";
        for (const e of json.errores) report += "• " + e + "\n";
      }

      setReportText(report);
      setMsg("Importación completada correctamente.");
      setModalOpen(true);

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

      {/* ---------------------------------------------------------
         MODAL REPORTE COMPLETO
      ----------------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl p-6 shadow-xl space-y-4">

            <h2 className="text-xl font-bold">Reporte de cambios</h2>

            <pre className="bg-gray-100 p-4 rounded max-h-[60vh] overflow-auto whitespace-pre-wrap text-sm">
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
    </ImportExportLayout>
  );
}
