"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ConfirmStep({
  fileName,
  groupedPOs,
  onBack,
  onConfirm,
}: {
  fileName?: string;
  groupedPOs: any[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [phase, setPhase] = useState<"compare" | "confirm">("compare");

  // =========================
  // 🧩 1️⃣ COMPARAR
  // =========================
  const handleCompare = async () => {
    if (!groupedPOs || groupedPOs.length === 0) {
      alert("⚠️ No hay datos para comparar.");
      return;
    }

    setLoading(true);
    setComparison(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/compare-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs, fileName }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al comparar.");

      setComparison(json);
      setPhase("confirm");
      console.log("📊 Resultado comparación:", json);
    } catch (err: any) {
      console.error("❌ Error comparando:", err);
      alert("❌ Error durante la comparación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 🚀 2️⃣ IMPORTAR
  // =========================
  const handleImport = async () => {
    setLoading(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs, fileName }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error en la importación.");

      setImportResult(json);
      alert(`✅ Importación completada correctamente.\n${json.summary}`);
      onConfirm();
    } catch (err: any) {
      console.error("❌ Error importando:", err);
      alert("❌ Error durante la importación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 💄 Renderizado
  // =========================
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-2xl font-semibold mb-4">Confirmar importación</h2>
      <p className="mb-2 text-gray-700">
        Archivo: <strong>{fileName || "(sin nombre)"}</strong>
      </p>
      <p className="mb-6 text-gray-500">
        Total POs detectados: <strong>{groupedPOs?.length || 0}</strong>
      </p>

      {/* === Estado inicial === */}
      {phase === "compare" && !comparison && (
        <div className="flex justify-center gap-4">
          <Button onClick={onBack} variant="outline" disabled={loading}>
            ← Volver
          </Button>
          <Button
            onClick={handleCompare}
            disabled={loading}
            className="bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            {loading ? "Comparando..." : "Comparar con base de datos →"}
          </Button>
        </div>
      )}

      {/* === Resultado comparación === */}
      {comparison && phase === "confirm" && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6 text-left">
          <h3 className="text-lg font-semibold mb-2 text-center">
            📊 Resultado de comparación
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>🟢 Nuevos: <strong>{comparison.nuevos}</strong></li>
            <li>🟡 Modificados: <strong>{comparison.modificados}</strong></li>
            <li>⚪ Sin cambios: <strong>{comparison.sinCambios}</strong></li>
          </ul>

          {comparison.detalle?.length > 0 && (
            <div className="max-h-60 overflow-y-auto mt-3 text-xs bg-white border rounded p-2">
              {comparison.detalle.slice(0, 10).map((po: any, i: number) => (
                <div key={i} className="border-b border-gray-100 py-1">
                  <p className="font-semibold text-gray-800">
                    PO {po.po} — {po.tipo}
                  </p>
                  {po.headerChanges?.length > 0 && (
                    <ul className="ml-4 list-disc text-gray-600">
                      {po.headerChanges.map((c: string, j: number) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  )}
                  {po.lineChanges?.length > 0 && (
                    <ul className="ml-4 list-disc text-gray-600">
                      {po.lineChanges.map((l: any, k: number) => (
                        <li key={k}>
                          {l.linea}: {l.cambios.join(", ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {comparison.detalle.length > 10 && (
                <p className="text-gray-400 text-center mt-2">
                  ...y {comparison.detalle.length - 10} más
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center gap-4 mt-6">
            <Button onClick={onBack} variant="outline" disabled={loading}>
              ← Volver
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading}
              className="bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              {loading ? "Importando..." : "Confirmar importación →"}
            </Button>
          </div>
        </div>
      )}

      {/* === Resultado final === */}
      {importResult && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          <p>
            ✅ {importResult.summary || "Importación completada correctamente."}
          </p>
        </div>
      )}
    </div>
  );
}
