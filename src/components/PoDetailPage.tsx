"use client";

import { useState } from "react";

type PoDetailPageProps = {
  po: any;
  onSave?: (po: any) => void;
  onDelete?: (id: string) => void;
  onBack?: () => void;
};

function formatNumber(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PoDetailPage({
  po,
  onSave,
  onDelete,
  onBack,
}: PoDetailPageProps) {
  const [data, setData] = useState(po);

  const handleSave = () => {
    if (onSave) onSave(data);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(po.id);
  };

  const supplierNorm = String(po?.supplier ?? "").trim().toUpperCase();
  const isBSG = supplierNorm === "BSG";

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Detalles del PO {po.po}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <b>Proveedor:</b> {po.supplier}
        </div>
        <div>
          <b>Cliente:</b> {po.customer}
        </div>
        <div>
          <b>Factory:</b> {po.factory}
        </div>
        <div>
          <b>Canal:</b> {po.channel}
        </div>
        <div>
          <b>PO Date:</b> {po.po_date || "-"}
        </div>
        <div>
          <b>ETD PI:</b> {po.etd_pi || "-"}
        </div>
        <div>
          <b>Booking:</b> {po.booking || "-"}
        </div>
        <div>
          <b>Closing:</b> {po.closing || "-"}
        </div>
        <div>
          <b>Shipping Date:</b> {po.shipping_date || "-"}
        </div>
      </div>

      <h2 className="font-semibold mb-2">Líneas de pedido</h2>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Referencia</th>
              <th className="p-2 text-left">Style</th>
              <th className="p-2 text-left">Color</th>
              <th className="p-2 text-left">Size Run</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Amount</th>

              {/* ✅ BSG (solo aplica si Supplier=BSG) */}
              <th className="p-2 text-left">PI BSG</th>
              <th className="p-2 text-right">Selling Price</th>
              <th className="p-2 text-right">Selling Amount</th>

              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Trial Upper</th>
              <th className="p-2 text-left">Trial Lasting</th>
              <th className="p-2 text-left">Lasting</th>
              <th className="p-2 text-left">Finish Date</th>
              <th className="p-2 text-left">Inspection</th>
              <th className="p-2 text-left">Estado Inspección</th>
            </tr>
          </thead>

          <tbody>
            {po.lineas_pedido?.map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.reference}</td>
                <td className="p-2">{l.style}</td>
                <td className="p-2">{l.color}</td>
                <td className="p-2">{l.size_run}</td>

                <td className="p-2 text-right">{l.qty}</td>
                <td className="p-2 text-right">{formatNumber(l.price)}</td>
                <td className="p-2 text-right">{formatNumber(l.amount)}</td>

                {/* ✅ BSG por línea */}
                <td className="p-2">
                  {isBSG ? (String(l.pi_bsg ?? "").trim() || "-") : "—"}
                </td>
                <td className="p-2 text-right">
                  {isBSG ? formatNumber(l.price_selling) : "—"}
                </td>
                <td className="p-2 text-right">
                  {isBSG ? formatNumber(l.amount_selling) : "—"}
                </td>

                <td className="p-2">{l.category}</td>
                <td className="p-2">{l.trial_upper || "-"}</td>
                <td className="p-2">{l.trial_lasting || "-"}</td>
                <td className="p-2">{l.lasting || "-"}</td>
                <td className="p-2">{l.finish_date || "-"}</td>
                <td className="p-2">{l.inspection || "-"}</td>
                <td className="p-2">{l.estado_inspeccion || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold mb-2">Muestras</h2>
      {po.lineas_pedido?.map((l: any) => (
        <div key={l.id} className="mb-4">
          <p className="font-semibold mb-1">
            {l.reference} - {l.style} - {l.color}
          </p>
          {l.muestras?.length > 0 ? (
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Round</th>
                  <th className="p-2 text-left">Notas</th>
                </tr>
              </thead>
              <tbody>
                {l.muestras.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">{m.tipo_muestra}</td>
                    <td className="p-2">
                      {m.fecha_muestra
                        ? new Date(m.fecha_muestra).toLocaleDateString()
                        : m.fecha_teorica
                        ? `(Est.) ${new Date(m.fecha_teorica).toLocaleDateString()}`
                        : "-"}
                    </td>
                    <td className="p-2">{m.estado_muestra}</td>
                    <td className="p-2">{m.round}</td>
                    <td className="p-2">{m.notas || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No hay muestras</p>
          )}
        </div>
      ))}

      <div className="mt-6 flex gap-2">
        {onSave && (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleSave}
          >
            💾 Guardar
          </button>
        )}
        {onDelete && (
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={handleDelete}
          >
            🗑️ Eliminar
          </button>
        )}
        {onBack && (
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={onBack}
          >
            ← Volver
          </button>
        )}
      </div>
    </div>
  );
}
