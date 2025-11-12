"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface LineData {
  reference: string;
  style: string;
  color: string;
  size_run?: string;
  qty: number;
  price: number;
  amount?: number;
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;
  cfm?: string | null;
  counter_sample?: string | null;
  fitting?: string | null;
  pps?: string | null;
  testing_sample?: string | null;
  shipping_sample?: string | null;
  inspection?: string | null;
}

interface POHeader {
  po?: string;
  supplier?: string;
  factory?: string;
  customer?: string;
  season?: string;
  category?: string;
  channel?: string;
  po_date?: string;
  etd_pi?: string;
  booking?: string;
  closing?: string;
  shipping_date?: string;
  currency?: string;
  pi?: string;
  estado_inspeccion?: string;
}

interface POGroup {
  header?: POHeader;
  lines?: LineData[];
}

interface PreviewStepProps {
  data: POGroup[];
  onBack: () => void;
  onNextWithCompare: (compareResult: any) => void;
}

export default function PreviewStep({
  data,
  onBack,
  onNextWithCompare,
}: PreviewStepProps) {
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  /** === Fetch comparación === */
  useEffect(() => {
    const fetchCompare = async () => {
      setLoading(true);
      const res = await fetch("/api/compare-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupedPOs: data, fileName: "preview.csv" }),
      });
      const json = await res.json();
      setCompareResult(json);
      setLoading(false);
    };
    fetchCompare();
  }, [data]);

  const formatDate = (v?: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toISOString().split("T")[0];
  };

  const formatUSD = (num?: number) =>
    num == null ? "-" : `$${num.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`;

  const highlight = (po: string, field: string, value: any) => {
    const cambios = compareResult?.detalles?.[po]?.cambios || [];
    const changed = cambios.some((c: any) => c.campo?.includes(field));
    return changed ? <span className="bg-yellow-100 px-1 rounded">{value}</span> : value;
  };

  if (loading) return <div className="text-center py-10 text-gray-600">Comparando datos...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-center">Previsualización y comparación</h2>
      {compareResult && (
        <p className="text-center">
          🟢 Nuevos: <b>{compareResult.nuevos}</b> | 🟠 Modificados:{" "}
          <b>{compareResult.modificados}</b> | ⚪ Sin cambios:{" "}
          <b>{compareResult.sinCambios}</b>
        </p>
      )}

      {data.map((po, i) => {
        const h = po.header!;
        const lines = po.lines || [];
        const totalQty = lines.reduce((a, b) => a + (b.qty || 0), 0);
        const totalAmount = lines.reduce(
          (a, b) => a + (b.qty || 0) * (b.price || 0),
          0
        );

        return (
          <div key={i} className="border border-gray-200 rounded-xl p-6 bg-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-lg">
                  PO: {h.po}{" "}
                  {compareResult?.detalles?.[h.po]?.status === "modificado" && (
                    <span className="text-orange-500 text-sm">(modificado)</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {h.supplier || "-"} / {h.customer || "-"} / {h.factory || "-"}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {totalQty.toLocaleString("es-ES")} uds — {formatUSD(totalAmount)}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Season: {h.season || "-"} | Category: {h.category || "-"} | Channel: {h.channel || "-"}<br/>
              PO Date: {highlight(h.po!, "po_date", formatDate(h.po_date))} | ETD PI: {highlight(h.po!, "etd_pi", formatDate(h.etd_pi))} | Booking: {highlight(h.po!, "booking", formatDate(h.booking))} | Shipping: {highlight(h.po!, "shipping_date", formatDate(h.shipping_date))} | Closing: {highlight(h.po!, "closing", formatDate(h.closing))}<br/>
              PI: {highlight(h.po!, "pi", h.pi || "-")} | Currency: {h.currency || "USD"} | Insp.: {h.estado_inspeccion || "-"}
            </p>

            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-sm border-t border-gray-200">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-2 text-left">Ref</th>
                    <th className="p-2 text-left">Style</th>
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-center">Trial U</th>
                    <th className="p-2 text-center">Trial L</th>
                    <th className="p-2 text-center">Lasting</th>
                    <th className="p-2 text-center">Finish D</th>
                    <th className="p-2 text-center">CFM</th>
                    <th className="p-2 text-center">Counter S</th>
                    <th className="p-2 text-center">Fitting S</th>
                    <th className="p-2 text-center">PPS</th>
                    <th className="p-2 text-center">Testing S</th>
                    <th className="p-2 text-center">Shipping S</th>
                    <th className="p-2 text-center">Inspection</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-2">{l.reference}</td>
                      <td className="p-2">{l.style}</td>
                      <td className="p-2">{l.color}</td>
                      <td className="p-2 text-right">{l.qty}</td>
                      <td className="p-2 text-right">{formatUSD(l.price)}</td>
                      <td className="p-2 text-right">{formatUSD(l.amount)}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → trial_upper`, formatDate(l.trial_upper))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → trial_lasting`, formatDate(l.trial_lasting))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → lasting`, formatDate(l.lasting))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → finish_date`, formatDate(l.finish_date))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → CFM`, formatDate(l.cfm))}</td>
                      <td className="p-2 text-center">{formatDate(l.counter_sample)}</td>
                      <td className="p-2 text-center">{formatDate(l.fitting)}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → PPS`, formatDate(l.pps))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → TESTING S`, formatDate(l.testing_sample))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → SHIPPING S`, formatDate(l.shipping_sample))}</td>
                      <td className="p-2 text-center">{highlight(h.po!, `${l.reference} → INSPECTION`, formatDate(l.inspection))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onBack} variant="outline">← Volver</Button>
        <Button
          onClick={() => onNextWithCompare(compareResult)}
          className="bg-green-600 text-white font-semibold hover:bg-green-700"
        >
          Confirmar importación →
        </Button>
      </div>
    </div>
  );
}
