"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface LineData {
  reference: string;
  style: string;
  color: string;
  size_run?: string;
  category?: string | null;
  channel?: string | null;
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
  inspection_approval_date?: string | null;
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

  const formatDate = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toISOString().split("T")[0];
  };

  const formatUSD = (num?: number) =>
    num == null
      ? "-"
      : `$${num.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`;

  const highlight = (po: string, field: string, value: React.ReactNode) => {
    const cambios = compareResult?.detalles?.[po]?.cambios || [];
    const changed = cambios.some((c: any) => c.campo?.includes(field));

    return changed ? (
      <span className="rounded bg-yellow-100 px-1">{value}</span>
    ) : (
      value
    );
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-600">
        Comparando datos...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-center text-2xl font-semibold">
        Previsualización y comparación
      </h2>

      {compareResult ? (
        <p className="text-center">
          🟢 Nuevos: <b>{compareResult.nuevos}</b> | 🟠 Modificados:{" "}
          <b>{compareResult.modificados}</b> | ⚪ Sin cambios:{" "}
          <b>{compareResult.sinCambios}</b>
        </p>
      ) : null}

      {data.map((po, index) => {
        const h = po.header ?? {};
        const poKey = h.po ?? "";
        const lines = po.lines ?? [];

        const totalQty = lines.reduce((acc, line) => acc + (line.qty || 0), 0);
        const totalAmount = lines.reduce(
          (acc, line) => acc + (line.qty || 0) * (line.price || 0),
          0
        );

        return (
          <div
            key={`${poKey}-${index}`}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold">
                  PO: {poKey || "-"}{" "}
                  {poKey &&
                  compareResult?.detalles?.[poKey]?.status === "modificado" ? (
                    <span className="text-sm text-orange-500">
                      (modificado)
                    </span>
                  ) : null}
                </p>

                <p className="text-sm text-gray-600">
                  {h.supplier || "-"} / {h.customer || "-"} /{" "}
                  {h.factory || "-"}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                {totalQty.toLocaleString("es-ES")} uds —{" "}
                {formatUSD(totalAmount)}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Season: {h.season || "-"} | Category: {h.category || "-"} |
              Channel: {h.channel || "-"}
              <br />
              PO Date: {highlight(poKey, "po_date", formatDate(h.po_date))} |
              ETD PI: {highlight(poKey, "etd_pi", formatDate(h.etd_pi))} |
              Booking: {highlight(poKey, "booking", formatDate(h.booking))} |
              Shipping:{" "}
              {highlight(poKey, "shipping_date", formatDate(h.shipping_date))} |
              Closing: {highlight(poKey, "closing", formatDate(h.closing))}
              <br />
              PI: {highlight(poKey, "pi", h.pi || "-")} | Currency:{" "}
              {h.currency || "USD"} | Insp.: {h.estado_inspeccion || "-"}
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-t border-gray-200 text-sm">
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
                  {lines.map((line, lineIndex) => (
                    <tr
                      key={`${line.reference}-${lineIndex}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-2">{line.reference}</td>
                      <td className="p-2">{line.style}</td>
                      <td className="p-2">{line.color}</td>
                      <td className="p-2 text-right">{line.qty}</td>
                      <td className="p-2 text-right">{formatUSD(line.price)}</td>
                      <td className="p-2 text-right">{formatUSD(line.amount)}</td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → trial_upper`,
                          formatDate(line.trial_upper)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → trial_lasting`,
                          formatDate(line.trial_lasting)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → lasting`,
                          formatDate(line.lasting)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → finish_date`,
                          formatDate(line.finish_date)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → CFM`,
                          formatDate(line.cfm)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {formatDate(line.counter_sample)}
                      </td>

                      <td className="p-2 text-center">
                        {formatDate(line.fitting)}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → PPS`,
                          formatDate(line.pps)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → TESTINGS`,
                          formatDate(line.testing_sample)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → SHIPPINGS`,
                          formatDate(line.shipping_sample)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → INSPECTION`,
                          formatDate(line.inspection_approval_date)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>

        <Button
          onClick={() => onNextWithCompare(compareResult)}
          className="bg-green-600 font-semibold text-white hover:bg-green-700"
        >
          Confirmar importación →
        </Button>
      </div>
    </div>
  );
}