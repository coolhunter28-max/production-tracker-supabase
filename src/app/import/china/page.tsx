"use client";

import { useState } from "react";
import ImportExportLayout from "@/components/layout/ImportExportLayout";
import { Button } from "@/components/ui/button";

type ImportChinaResponse = {
  status?: "ok" | "blocked" | string;
  pos_encontrados?: number;
  lineas_actualizadas?: number;
  muestras_actualizadas?: number;
  avisos?: string[];
  errores?: string[];
  detalles?: {
    cambios?: string[];
  };
  error?: string;
};

function buildReport(json: ImportChinaResponse) {
  const avisos = Array.isArray(json.avisos) ? json.avisos : [];
  const errores = Array.isArray(json.errores) ? json.errores : [];
  const cambios = Array.isArray(json.detalles?.cambios)
    ? json.detalles?.cambios ?? []
    : [];

  const isBlocked = json.status === "blocked";

  let report = isBlocked
    ? "===== IMPORTACIÓN CHINA BLOQUEADA =====\n\n"
    : "===== INFORME IMPORTACIÓN CHINA =====\n\n";

  report += `Estado: ${json.status ?? "desconocido"}\n`;
  report += `POs encontrados: ${json.pos_encontrados ?? 0}\n`;
  report += `Líneas actualizadas: ${json.lineas_actualizadas ?? 0}\n`;
  report += `Muestras actualizadas: ${json.muestras_actualizadas ?? 0}\n`;
  report += `Avisos: ${avisos.length}\n`;
  report += `Errores: ${errores.length}\n\n`;

  if (isBlocked) {
    report += "IMPORTANTE:\n";
    report += "La importación se ha bloqueado antes de escribir datos.\n";
    report += "No se ha actualizado ninguna línea ni muestra.\n";
    report += "Corrige los errores indicados y vuelve a importar.\n\n";
  }

  if (cambios.length) {
    report += "=== CAMBIOS ===\n";
    for (const c of cambios) report += `• ${c}\n`;
    report += "\n";
  }

  if (avisos.length) {
    report += "=== AVISOS ===\n";
    for (const a of avisos) report += `• ${a}\n`;
    report += "\n";
  }

  if (errores.length) {
    report += "=== ERRORES ===\n";
    for (const e of errores) report += `• ${e}\n`;
    report += "\n";
  }

  if (json.error && !errores.includes(json.error)) {
    report += "=== ERROR GENERAL ===\n";
    report += `${json.error}\n`;
  }

  return report;
}

export default function ImportChinaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState<"ok" | "blocked" | "error" | null>(null);

  const downloadTxt = () => {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      reportStatus === "blocked"
        ? "import-china-bloqueada.txt"
        : "import-china-report.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      alert("Selecciona un archivo primero");
      return;
    }

    setLoading(true);
    setMsg("");
    setReportText("");
    setReportStatus(null);
    setModalOpen(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import-china", {
        method: "POST",
        body: formData,
      });

      const raw = await res.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const invalidReport =
          "===== ERROR IMPORTACIÓN CHINA =====\n\n" +
          "El servidor devolvió una respuesta no válida.\n\n" +
          raw.slice(0, 4000);

        setReportText(invalidReport);
        setReportStatus("error");
        setMsg("Error: respuesta inválida del servidor. Abre el reporte para ver el detalle.");
        setModalOpen(true);
        return;
      }

      const json = (parsed ?? {}) as ImportChinaResponse;
      const report = buildReport(json);
      setReportText(report);

      if (!res.ok) {
        setReportStatus("error");
        setMsg(json.error || "Error en la importación. Abre el reporte para ver el detalle.");
        setModalOpen(true);
        return;
      }

      if (json.status === "blocked") {
        setReportStatus("blocked");
        setMsg(
          "Importación bloqueada por seguridad. No se ha actualizado ningún dato. Abre el reporte para corregir el Excel."
        );
        setModalOpen(true);
        return;
      }

      if (json.status !== "ok") {
        setReportStatus("error");
        setMsg(json.error || "Error en la importación. Abre el reporte para ver el detalle.");
        setModalOpen(true);
        return;
      }

      setReportStatus("ok");
      setMsg("Importación completada correctamente.");
      setModalOpen(true);
    } catch (error) {
      console.error(error);

      setReportText(
        "===== ERROR IMPORTACIÓN CHINA =====\n\n" +
          "Error inesperado importando el archivo.\n" +
          "Revisa la consola del servidor o vuelve a intentarlo."
      );
      setReportStatus("error");
      setMsg("Error inesperado importando el archivo.");
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const modalTitle =
    reportStatus === "blocked"
      ? "Importación bloqueada"
      : reportStatus === "error"
      ? "Error de importación"
      : "Reporte de cambios";

  return (
    <ImportExportLayout
      title="Import China – Archivo de Producción"
      subtitle="Sube el archivo Excel procedente de China para actualizar el estado de fabricación y muestras."
    >
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
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg shadow"
        >
          {loading ? "Importando..." : "Importar archivo"}
        </button>

        {msg && (
          <div
            className={[
              "p-4 rounded-lg whitespace-pre-wrap border text-sm",
              reportStatus === "blocked"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : reportStatus === "error"
                ? "bg-red-50 border-red-300 text-red-900"
                : reportStatus === "ok"
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-gray-100 border-gray-200",
            ].join(" ")}
          >
            {msg}
            {reportText && (
              <div className="mt-3">
                <Button variant="outline" onClick={() => setModalOpen(true)}>
                  Ver reporte
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-xl font-bold">{modalTitle}</h2>
              {reportStatus === "blocked" && (
                <p className="text-sm text-amber-700 mt-1">
                  La importación se ha detenido antes de escribir datos. Corrige los errores del Excel y vuelve a importar.
                </p>
              )}
            </div>

            <pre className="bg-gray-100 p-4 rounded max-h-[65vh] overflow-auto whitespace-pre-wrap text-sm border">
              {reportText}
            </pre>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={downloadTxt}>
                Descargar TXT
              </Button>
              <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </ImportExportLayout>
  );
}
