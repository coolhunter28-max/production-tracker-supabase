"use client";

import React, { useEffect, useMemo, useState } from "react";
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

interface CompareChange {
  campo: string;
  old?: string | number | null;
  new?: string | number | null;
}

interface CompareDetail {
  status?: "nuevo" | "modificado" | "cancelado" | "sin_cambios" | string;
  cambios?: CompareChange[];
}

interface CompareResult {
  nuevos?: number;
  modificados?: number;
  cancelados?: number;
  sinCambios?: number;
  detalles?: Record<string, CompareDetail>;
  error?: string;
}

interface PreviewStepProps {
  data: POGroup[];
  onBack: () => void;
  onNextWithCompare: (compareResult: CompareResult | null) => void;
}

function normalize(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function statusLabel(status?: string) {
  if (status === "nuevo") return "NUEVO";
  if (status === "modificado") return "MODIFICADO";
  if (status === "cancelado") return "CANCELADO";
  if (status === "sin_cambios") return "SIN CAMBIOS";
  return "SIN ESTADO";
}

function statusClass(status?: string) {
  if (status === "nuevo") return "bg-green-100 text-green-700 border-green-200";
  if (status === "modificado") return "bg-orange-100 text-orange-700 border-orange-200";
  if (status === "cancelado") return "bg-red-100 text-red-700 border-red-200";
  if (status === "sin_cambios") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function isLineChange(change: CompareChange) {
  const campo = String(change.campo ?? "").toLowerCase();
  return (
    campo.includes("línea") ||
    campo.includes("linea") ||
    campo.includes("→") ||
    campo.includes("muestra") ||
    campo.includes("cfm") ||
    campo.includes("counter") ||
    campo.includes("fitting") ||
    campo.includes("pps") ||
    campo.includes("testing") ||
    campo.includes("shipping")
  );
}

function ChangeList({ cambios }: { cambios: CompareChange[] }) {
  if (!cambios || cambios.length === 0) return null;

  const headerChanges = cambios.filter((change) => !isLineChange(change));
  const lineChanges = cambios.filter((change) => isLineChange(change));

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-900">
        Cambios detectados
      </p>

      {headerChanges.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase text-amber-700">
            Cabecera
          </p>
          <div className="overflow-x-auto rounded border border-amber-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-amber-50 text-left text-amber-800">
                <tr>
                  <th className="px-2 py-1">Campo</th>
                  <th className="px-2 py-1">Antes</th>
                  <th className="px-2 py-1">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {headerChanges.map((change, index) => (
                  <tr key={`${change.campo}-${index}`} className="border-t">
                    <td className="px-2 py-1 font-medium">{change.campo}</td>
                    <td className="px-2 py-1 text-slate-500">
                      {normalize(change.old)}
                    </td>
                    <td className="px-2 py-1 font-semibold text-slate-900">
                      {normalize(change.new)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lineChanges.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-amber-700">
            Líneas / muestras
          </p>
          <div className="max-h-56 overflow-auto rounded border border-amber-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-amber-50 text-left text-amber-800">
                <tr>
                  <th className="px-2 py-1">Cambio</th>
                  <th className="px-2 py-1">Antes</th>
                  <th className="px-2 py-1">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {lineChanges.map((change, index) => (
                  <tr key={`${change.campo}-${index}`} className="border-t">
                    <td className="px-2 py-1 font-medium">{change.campo}</td>
                    <td className="px-2 py-1 text-slate-500">
                      {normalize(change.old)}
                    </td>
                    <td className="px-2 py-1 font-semibold text-slate-900">
                      {normalize(change.new)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreviewStep({
  data,
  onBack,
  onNextWithCompare,
}: PreviewStepProps) {
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompare = async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/compare-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupedPOs: data, fileName: "preview.csv" }),
        });

        const json = await res.json();
        setCompareResult(json);
      } finally {
        setLoading(false);
      }
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

  const getDetail = (po: string): CompareDetail | undefined =>
    compareResult?.detalles?.[po];

  const highlight = (po: string, field: string, value: React.ReactNode) => {
    const cambios = getDetail(po)?.cambios || [];
    const changed = cambios.some((c: CompareChange) =>
      String(c.campo ?? "").includes(field)
    );

    return changed ? (
      <span className="rounded bg-yellow-100 px-1 font-semibold text-yellow-900">
        {value}
      </span>
    ) : (
      value
    );
  };

  const cancelledDetails = useMemo(() => {
    const detalles = compareResult?.detalles ?? {};
    return Object.entries(detalles).filter(
      ([, detail]) => detail?.status === "cancelado"
    );
  }, [compareResult]);

  const newDetails = useMemo(() => {
    const detalles = compareResult?.detalles ?? {};
    return Object.entries(detalles).filter(
      ([, detail]) => detail?.status === "nuevo"
    );
  }, [compareResult]);

  const modifiedDetails = useMemo(() => {
    const detalles = compareResult?.detalles ?? {};
    return Object.entries(detalles).filter(
      ([, detail]) => detail?.status === "modificado"
    );
  }, [compareResult]);

  if (loading) {
    return (
      <div className="py-10 text-center text-gray-600">
        Comparando datos...
      </div>
    );
  }

  if (compareResult?.error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {compareResult.error}
        </div>

        <div className="flex justify-center">
          <Button onClick={onBack} variant="outline">
            ← Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-center text-2xl font-semibold">
        Previsualización y comparación
      </h2>

      {compareResult ? (
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            🟢 Nuevos: <b>{compareResult.nuevos ?? 0}</b>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-700">
            🟠 Modificados: <b>{compareResult.modificados ?? 0}</b>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            🔴 Cancelados: <b>{compareResult.cancelados ?? 0}</b>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
            ⚪ Sin cambios: <b>{compareResult.sinCambios ?? 0}</b>
          </div>
        </div>
      ) : null}

      {compareResult && (
        <div className="mx-auto max-w-5xl space-y-4">
          {newDetails.length > 0 && (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h3 className="mb-2 font-semibold text-green-800">
                POs nuevos detectados
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {newDetails.map(([po, detail]) => (
                  <div key={po} className="rounded border border-green-100 bg-white p-3 text-sm">
                    <div className="font-semibold">{po}</div>
                    <ChangeList cambios={detail.cambios ?? []} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {cancelledDetails.length > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 font-semibold text-red-800">
                Cancelaciones detectadas
              </h3>
              <p className="mb-3 text-sm text-red-700">
                Estos POs existen en Production Tracker pero no aparecen en el CSV importado.
                Al confirmar, quedarán marcados como cancelados, no se borrarán físicamente.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {cancelledDetails.map(([po, detail]) => (
                  <div key={po} className="rounded border border-red-100 bg-white p-3 text-sm">
                    <div className="font-semibold">{po}</div>
                    <ChangeList cambios={detail.cambios ?? []} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {modifiedDetails.length > 0 && (
            <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-2 font-semibold text-orange-800">
                POs modificados
              </h3>
              <p className="text-sm text-orange-700">
                Cada tarjeta modificada muestra el detalle de campos detectados.
              </p>
            </section>
          )}
        </div>
      )}

      {data.map((po, index) => {
        const h = po.header ?? {};
        const poKey = h.po ?? "";
        const lines = po.lines ?? [];
        const detail = getDetail(poKey);
        const status = detail?.status ?? "sin_cambios";
        const cambios = detail?.cambios ?? [];

        const totalQty = lines.reduce((acc, line) => acc + (line.qty || 0), 0);
        const totalAmount = lines.reduce(
          (acc, line) => acc + (line.qty || 0) * (line.price || 0),
          0
        );

        return (
          <div
            key={`${poKey}-${index}`}
            className={`rounded-xl border bg-white p-6 ${
              status === "nuevo"
                ? "border-green-200"
                : status === "modificado"
                ? "border-orange-200"
                : status === "cancelado"
                ? "border-red-200"
                : "border-gray-200"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  <span>PO: {poKey || "-"}</span>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(
                      status
                    )}`}
                  >
                    {statusLabel(status)}
                  </span>
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

            {cambios.length > 0 && <ChangeList cambios={cambios} />}

            <p className="mt-4 text-sm text-gray-500">
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
                      key={`${line.reference}-${line.style}-${line.color}-${line.size_run ?? ""}-${lineIndex}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-2">{line.reference}</td>
                      <td className="p-2">{line.style}</td>
                      <td className="p-2">{line.color}</td>
                      <td className="p-2 text-right">
                        {highlight(
                          poKey,
                          `${line.reference} → qty`,
                          line.qty
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {highlight(
                          poKey,
                          `${line.reference} → price`,
                          formatUSD(line.price)
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {highlight(
                          poKey,
                          `${line.reference} → amount`,
                          formatUSD(line.amount)
                        )}
                      </td>

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
                        {highlight(
                          poKey,
                          `${line.reference} → COUNTER_SAMPLE`,
                          formatDate(line.counter_sample)
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {highlight(
                          poKey,
                          `${line.reference} → FITTING`,
                          formatDate(line.fitting)
                        )}
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
          disabled={!compareResult}
          className="bg-green-600 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Confirmar importación →
        </Button>
      </div>
    </div>
  );
}
