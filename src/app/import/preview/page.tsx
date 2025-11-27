"use client";
import React from "react";

export default function PreviewStep({ data, onBack, onNext }: any) {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Previsualización de datos
      </h1>

      <p className="text-center text-gray-500 mb-6">
        Se detectaron <strong>{data.length}</strong> pedidos (POs). Revisa la
        información antes de confirmar la importación.
      </p>

      <div className="space-y-8">
        {data.map((po: any, idx: number) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
          >
            {/* === CABECERA === */}
            <div className="flex justify-between mb-2">
              <h2 className="font-semibold text-lg">PO: {po.po}</h2>
              <span className="text-sm text-gray-500">
                {po.totalPairs || 0} uds — ${po.totalAmount?.toLocaleString() || "0,00"}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3 leading-6">
              {po.supplier || "-"} / {po.customer || "-"} / {po.factory || "-"}
              <br />
              Season: {po.season || "-"} | Category: {po.category || "-"} | Channel: {po.channel || "-"}
              <br />
              PO Date: {po.po_date || "-"} | ETD PI: {po.etd_pi || "-"} | Booking:{" "}
              {po.booking || "-"} | Shipping: {po.shipping_date || "-"} | Closing:{" "}
              {po.closing || "-"}
              <br />
              PI: {po.pi || "-"} | Currency: {po.currency || "-"} | Estado Insp.:{" "}
              {po.estado_inspeccion || "-"}
            </p>

            {/* === LÍNEAS DE PEDIDO === */}
            {po.lines && po.lines.length > 0 && (
              <table className="w-full text-sm border-t border-gray-100 mb-3">
                <thead>
                  <tr className="text-gray-700 bg-gray-50">
                    <th className="p-1 text-left">Reference</th>
                    <th className="p-1 text-left">Style</th>
                    <th className="p-1 text-left">Color</th>
                    <th className="p-1 text-left">Size Run</th>
                    <th className="p-1 text-left">Category</th>
                    <th className="p-1 text-left">Channel</th>
                    <th className="p-1 text-right">Qty</th>
                    <th className="p-1 text-right">Price</th>
                    <th className="p-1 text-right">Amount</th>
                    <th className="p-1 text-center">Trial U</th>
                    <th className="p-1 text-center">Trial L</th>
                    <th className="p-1 text-center">Lasting</th>
                    <th className="p-1 text-center">Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((line: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="p-1">{line.reference || "-"}</td>
                      <td className="p-1">{line.style || "-"}</td>
                      <td className="p-1">{line.color || "-"}</td>
                      <td className="p-1">{line.size_run || "-"}</td>
                      <td className="p-1">{line.category || "-"}</td>
                      <td className="p-1">{line.channel || "-"}</td>
                      <td className="p-1 text-right">{line.qty || 0}</td>
                      <td className="p-1 text-right">${line.price || "0,00"}</td>
                      <td className="p-1 text-right">${line.amount || "0,00"}</td>
                      <td className="p-1 text-center">{line.trial_upper || "-"}</td>
                      <td className="p-1 text-center">{line.trial_lasting || "-"}</td>
                      <td className="p-1 text-center">{line.lasting || "-"}</td>
                      <td className="p-1 text-center">{line.finish_date || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* === MUESTRAS === */}
            {po.muestras && po.muestras.length > 0 && (
              <div className="border-t pt-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Muestras
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left p-1">Tipo</th>
                      <th className="text-left p-1">Fecha</th>
                      <th className="text-left p-1">Estado</th>
                      <th className="text-left p-1">Round</th>
                      <th className="text-left p-1">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.muestras.map((m: any, j: number) => (
                      <tr key={j} className="border-t border-gray-100">
                        <td className="p-1">{m.tipo_muestra}</td>
                        <td className="p-1">{m.fecha_muestra || "-"}</td>
                        <td className="p-1">
                          {m.estado_muestra === "N/N"
                            ? "No Need"
                            : m.estado_muestra || "-"}
                        </td>
                        <td className="p-1">{m.round || "-"}</td>
                        <td className="p-1">
                          {m.notas
                            ? m.notas.includes("Confirmed")
                              ? `Confirmed ${m.notas.split("|")[1] || ""}`
                              : m.notas.includes("Not Confirmed")
                              ? `Not Confirmed ${m.notas.split("|")[1] || ""}`
                              : m.notas
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={onBack}
          className="bg-gray-200 px-4 py-2 rounded text-gray-700"
        >
          ← Volver
        </button>
        <button
          onClick={onNext}
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
        >
          Confirmar →
        </button>
      </div>
    </div>
  );
}
