"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface SampleStatus {
  needed: boolean;
  status?: string | null;
  round?: number | null;
  date?: string | null;
}

interface LineData {
  style: string;
  color: string;
  reference: string;
  qty: number;
  price: number;
  amount?: number;

  cfm?: SampleStatus;
  counter_sample?: SampleStatus;
  fitting?: SampleStatus;
  pps?: SampleStatus;
  testing_sample?: SampleStatus;
  shipping_sample?: SampleStatus;
  inspection?: SampleStatus;
  trial_upper?: SampleStatus;
  trial_lasting?: SampleStatus;
  lasting?: SampleStatus;
  finish_date?: SampleStatus;
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
  onNext: () => void;
}

export default function PreviewStep({ data, onBack, onNext }: PreviewStepProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No hay datos para previsualizar.</p>
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>
      </div>
    );
  }

  const formatMoney = (num?: number) => {
    if (num === undefined || isNaN(num)) return "-";
    return `$${num.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return date ?? "";
    return d.toISOString().split("T")[0];
  };

  const formatSampleCell = (sample?: SampleStatus) => {
    if (!sample || sample.needed === false) return "";
    return formatDate(sample.date);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-center">
        Previsualización de datos
      </h2>
      <p className="text-gray-600 text-center">
        Se detectaron <strong>{data.length}</strong> pedidos (POs). Revisa la
        información antes de confirmar la importación.
      </p>

      {data.map((po, idx) => {
        const header = po.header || {};
        const lines = Array.isArray(po.lines) ? po.lines : [];
        const totalQty = lines.reduce((sum, l) => sum + (l.qty || 0), 0);
        const totalAmount = lines.reduce(
          (sum, l) => sum + (l.qty || 0) * (l.price || 0),
          0
        );

        return (
          <div
            key={idx}
            className="border border-gray-200 rounded-2xl shadow-sm p-6 bg-white space-y-4"
          >
            {/* === CABECERA === */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="font-semibold text-lg">
                  PO: {header.po || "-"}
                </p>
                <p className="text-sm text-gray-600">
                  {header.supplier || "-"} / {header.customer || "-"} /{" "}
                  {header.factory || "-"}
                </p>
              </div>
              <div className="text-right text-sm text-gray-700">
                <p>
                  {totalQty.toLocaleString("es-ES")} unidades —{" "}
                  {formatMoney(totalAmount)}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">
              Season: {header.season || "-"} | Category:{" "}
              {header.category || "-"} | Channel: {header.channel || "-"}
              <br />
              PO Date: {formatDate(header.po_date)} | ETD PI:{" "}
              {formatDate(header.etd_pi)} | Booking:{" "}
              {formatDate(header.booking)} | Shipping:{" "}
              {formatDate(header.shipping_date)} | Closing:{" "}
              {formatDate(header.closing)}
              <br />
              PI: {header.pi || "-"} | Currency: {header.currency || "USD"} |
              Estado Insp.: {header.estado_inspeccion || "-"}
            </p>

            {/* === TABLA === */}
            <div className="overflow-x-auto mt-3">
              <table className="min-w-max text-sm border-t border-gray-200">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="p-2 text-left">Style</th>
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-center">CFM</th>
                    <th className="p-2 text-center">Counter</th>
                    <th className="p-2 text-center">Fitting</th>
                    <th className="p-2 text-center">PPS</th>
                    <th className="p-2 text-center">Testing</th>
                    <th className="p-2 text-center">Shipping</th>
                    <th className="p-2 text-center">Inspection</th>
                    <th className="p-2 text-center">Trial Upper</th>
                    <th className="p-2 text-center">Trial Lasting</th>
                    <th className="p-2 text-center">Lasting</th>
                    <th className="p-2 text-center">Finish Date</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const calcAmount = (line.qty || 0) * (line.price || 0);
                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="p-2 whitespace-nowrap text-ellipsis max-w-[120px]">
                          {line.style || "-"}
                        </td>
                        <td className="p-2 whitespace-nowrap text-ellipsis max-w-[120px]">
                          {line.color || "-"}
                        </td>
                        <td className="p-2">{line.reference || "-"}</td>
                        <td className="p-2 text-right">
                          {line.qty?.toLocaleString("es-ES") || "-"}
                        </td>
                        <td className="p-2 text-right">
                          {formatMoney(line.price)}
                        </td>
                        <td className="p-2 text-right">
                          {formatMoney(line.amount ?? calcAmount)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.cfm)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.counter_sample)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.fitting)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.pps)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.testing_sample)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.shipping_sample)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.inspection)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.trial_upper)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.trial_lasting)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.lasting)}
                        </td>
                        <td className="p-2 text-center">
                          {formatSampleCell(line.finish_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* === Botones === */}
      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onBack} variant="outline">
          ← Volver
        </Button>
        <Button
          onClick={onNext}
          className="bg-green-600 text-white font-semibold hover:bg-green-700"
        >
          Confirmar importación →
        </Button>
      </div>
    </div>
  );
}
