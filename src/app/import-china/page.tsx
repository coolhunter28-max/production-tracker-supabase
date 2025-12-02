"use client";

import React, { useState } from "react";

export default function ImportChinaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ----------------------------------------------------
  // 🔥 NUEVO handleUpload (incluye captura RAW + logs)
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

      // Capturamos la respuesta como texto ANTES de intentar JSON
      const text = await res.text();

      console.log("📌 RAW RESPONSE FROM SERVER:", text);

      // Intentamos convertir el texto a JSON
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error(
          "La API devolvió una respuesta NO válida. Respuesta recibida: " +
            text.substring(0, 500)
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Error desconocido al importar.");
      }

      // 🎯 Si llegamos aquí → todo correcto
      setResult(data);
    } catch (err: any) {
      console.error("IMPORT ERROR:", err);
      setErrorMsg(err.message || "Error al importar el archivo de China.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto p-10 space-y-6">
      <h1 className="text-2xl font-bold">📥 Importar datos desde China</h1>
      <p className="text-gray-600">
        Sube el archivo Excel que nos devuelve China con fechas de muestras,
        trials, booking, closing y shipping.
      </p>

      {/* INPUT */}
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
        }}
        className="border p-2 rounded w-full"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="px-5 py-2 bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? "Importando…" : "Importar archivo de China"}
      </button>

      {/* ERROR */}
      {errorMsg && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {errorMsg}
        </div>
      )}

      {/* RESULTADO */}
      {result && (
        <div className="p-4 bg-green-50 border border-green-300 rounded">
          <h2 className="text-lg font-bold text-green-700">
            Resultado de la importación
          </h2>

          <ul className="mt-2 space-y-1 text-sm">
            <li>
              POs encontrados: <b>{result.pos_encontrados}</b>
            </li>
            <li>
              Líneas actualizadas: <b>{result.lineas_actualizadas}</b>
            </li>
            <li>
              Muestras actualizadas: <b>{result.muestras_actualizadas}</b>
            </li>
          </ul>

          {result.avisos?.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded">
              <b>Avisos:</b>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {result.avisos.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errores?.length > 0 && (
            <div className="mt-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded">
              <b>Errores:</b>
              <ul className="list-disc ml-5 mt-1 text-sm">
                {result.errores.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
