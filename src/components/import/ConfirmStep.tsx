"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmStepProps {
  fileName?: string;
  groupedPOs: any[];
  onBack: () => void;
  onConfirm: () => void;
}

type Summary = { nuevos: number; modificados: number; sinCambios: number };

export default function ConfirmStep({
  fileName,
  groupedPOs,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detail, setDetail] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========= 1) Ejecutar comparación automáticamente =========
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/compare-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupedPOs, fileName }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Error en la comparación");

        // ⬇️ El endpoint devuelve: { nuevos, modificados, sinCambios, detalle }
        setSummary({
          nuevos: Number(data.nuevos || 0),
          modificados: Number(data.modificados || 0),
          sinCambios: Number(data.sinCambios || 0),
        });
        setDetail(Array.isArray(data.detalle) ? data.detalle : []);
      } catch (e: any) {
        console.error("❌ Compare error:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [groupedPOs, fileName]);

  // ========= 2) Confirmar e importar =========
  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs, fileName }),
      });
      const data = await res.json();
      alert(data.summary || "Importación completada.");
      onConfirm();
    } catch (e) {
      console.error(e);
      alert("Error al importar.");
    } finally {
      setImporting(false);
    }
  };

  // ========= Render helpers =========
  const FieldDiff = ({ text }: { text: string }) => {
    // p. ej. "pps: 2024-01-01 → 2025-03-26"
    const parts = String(text).split("→");
    return (
      <div>
        {parts.length === 2 ? (
          <>
            <span className="text-red-600">{parts[0].trim() || "-"}</span>{" "}
            <span className="text-gray-500">→</span>{" "}
            <span className="text-green-700">{parts[1].trim() || "-"}</span>
          </>
        ) : (
          <span>{text}</span>
        )}
      </div>
    );
  };

  return (
    <div className="text-center max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2">Confirmar importación</h2>
      <p className="text-gray-600">Archivo: <strong>{fileName || "(sin nombre)"}</strong></p>
      <p className="text-gray-600 mb-6">Total POs detectados: <strong>{groupedPOs?.length || 0}</strong></p>

      {/* Estado */}
      {loading && <p className="italic text-gray-500">Comparando datos con Supabase…</p>}
      {error && <p className="text-red-600 font-medium">Error: {error}</p>}

      {/* Resumen */}
      {summary && !loading && (
        <div className="bg-white border rounded-xl shadow-sm p-6 text-left">
          <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
            <span>📊 Resultado de la comparación</span>
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="bg-green-50 rounded-lg py-3">
              <p className="text-3xl font-bold text-green-700">{summary.nuevos}</p>
              <p className="text-gray-700">NUEVOS POs</p>
            </div>
            <div className="bg-blue-50 rounded-lg py-3">
              <p className="text-3xl font-bold text-blue-700">{summary.modificados}</p>
              <p className="text-gray-700">POs MODIFICADOS</p>
            </div>
            <div className="bg-gray-100 rounded-lg py-3">
              <p className="text-3xl font-bold text-gray-700">{summary.sinCambios}</p>
              <p className="text-gray-700">SIN CAMBIOS</p>
            </div>
          </div>

          {/* Detalle de modificados */}
          {detail && detail.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-md font-semibold text-gray-800">Detalle de POs modificados:</h4>
              <div className="max-h-[420px] overflow-y-auto space-y-3">
                {detail
                  .filter((d: any) => d.tipo === "modificado")
                  .map((d: any, i: number) => (
                    <details key={i} className="border rounded-lg p-3 bg-gray-50 open:bg-white">
                      <summary className="cursor-pointer font-medium text-blue-700">
                        {d.po}
                      </summary>

                      {/* Cabecera */}
                      {Array.isArray(d.headerChanges) && d.headerChanges.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold text-gray-900">Cabecera:</p>
                          <ul className="list-disc pl-5 text-sm">
                            {d.headerChanges.map((t: string, idx: number) => (
                              <li key={idx}><FieldDiff text={t} /></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Líneas */}
                      {Array.isArray(d.lineChanges) && d.lineChanges.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-gray-900">Líneas modificadas:</p>
                          <ul className="list-disc pl-5 text-sm space-y-2">
                            {d.lineChanges.map((ln: any, k: number) => (
                              <li key={k}>
                                <span className="font-medium">{ln.linea}</span>
                                {Array.isArray(ln.cambios) && ln.cambios.length > 0 && (
                                  <ul className="list-disc pl-5">
                                    {ln.cambios.map((c: string, j: number) => (
                                      <li key={j}><FieldDiff text={c} /></li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </details>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-center gap-4 mt-8">
        <Button onClick={onBack} variant="outline" disabled={importing || loading}>
          ← Volver
        </Button>
        <Button
          onClick={handleConfirmImport}
          disabled={importing || loading || !summary}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {importing ? "Importando..." : "Confirmar e importar →"}
        </Button>
      </div>
    </div>
  );
}
