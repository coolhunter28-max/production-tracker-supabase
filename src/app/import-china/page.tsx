"use client";

import React, { useState } from "react";

export default function ImportChinaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ----------------------------------------------------
  // Subir archivo
  // ----------------------------------------------------
  const handleUpload = async () => {
    setErrorMsg("");
    setResult(null);

    if (!file) {
      setErrorMsg("Por favor selecciona un archivo Excel.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-china", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      console.log("📌 RAW RESPONSE:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("La API devolvió texto no válido: " + text.slice(0, 300));
      }

      if (!res.ok) throw new Error(data.error || "Error desconocido");

      setResult(data);
    } catch (err: any) {
      console.error("IMPORT ERROR:", err);
      setErrorMsg(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // Descargar reporte TXT
  // ----------------------------------------------------
  const handleDownloadReport = () => {
    if (!result) return;

    let contenido = "=== INFORME IMPORTACIÓN CHINA ===\n\n";

    contenido += `POs encontrados: ${result.pos_encontrados}\n`;
    contenido += `Líneas actualizadas: ${result.lineas_actualizadas}\n`;
    contenido += `Muestras actualizadas: ${result.muestras_actualizadas}\n\n`;

    if (result.detalles?.cambios?.length) {
      contenido += "=== CAMBIOS ===\n";
      result.detalles.cambios.forEach((c: string) => {
        contenido += "• " + c + "\n";
      });
      contenido += "\n";
    }

    if (result.avisos?.length) {
      contenido += "=== AVISOS ===\n";
      result.avisos.forEach((a: string) => {
        contenido += "• " + a + "\n";
      });
      contenido += "\n";
    }

    if (result.errores?.length) {
      contenido += "=== ERRORES ===\n";
      result.errores.forEach((e: string) => {
        contenido += "• " + e + "\n";
      });
    }

    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "informe_import_china.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto p-10 space-y-6">
      <h1 className="text-2xl font-bold">📥 Importar datos desde China</h1>
      <p className="text-gray-600">
        Sube el archivo Excel devuelto por China para actualizar muestras y producción.
      </p>

      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 rounded w-full"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
      >
        {loading ? "Importando…" : "Importar archivo"}
      </button>

      {errorMsg && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {errorMsg}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-300 rounded space-y-4">
          <h2 className="text-lg font-bold text-green-700">
            Resultado de la importación
          </h2>

          <ul className="text-sm space-y-1">
            <li>POs encontrados: <b>{result.pos_encontrados}</b></li>
            <li>Líneas actualizadas: <b>{result.lineas_actualizadas}</b></li>
            <li>Muestras actualizadas: <b>{result.muestras_actualizadas}</b></li>
          </ul>

          {/* CAMBIOS */}
          {result.detalles?.cambios?.length > 0 && (
            <div className="p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded">
              <b>Cambios aplicados:</b>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {result.detalles.cambios.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AVISOS */}
          {result.avisos?.length > 0 && (
            <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded">
              <b>Avisos:</b>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {result.avisos.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ERRORES */}
          {result.errores?.length > 0 && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              <b>Errores:</b>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {result.errores.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* DESCARGAR REPORTE */}
          <button
            onClick={handleDownloadReport}
            className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Descargar informe TXT
          </button>
        </div>
      )}
    </div>
  );
}
