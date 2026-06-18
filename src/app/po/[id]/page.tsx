"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getEstadoColor, getEstadoIcon } from "@/utils/getEstadoColor";
import { getResumenPO } from "@/utils/getResumenPO";
import { getColorFechaMuestra } from "@/utils/getColorFechaMuestra";

const SAMPLE_TYPES = ["CFMS", "COUNTERS", "FITTINGS", "PPS", "TESTINGS", "SHIPPINGS"] as const;

function isNoNeedSample(m: any) {
  return (
    String(m?.round ?? "").trim().toUpperCase() === "N/N" ||
    String(m?.estado_muestra ?? "").trim().toUpperCase() === "N/N"
  );
}

function getDisplayEstadoMuestra(m: any) {
  if (isNoNeedSample(m)) return "N/N";

  const estado = String(m?.estado_muestra ?? "").trim();
  if (estado) return estado;

  if (m?.fecha_muestra) return "Enviado";
  return "Pendiente";
}

function getEstadoClass(estado: string) {
  if (estado === "N/N") return "text-gray-500";
  return getEstadoColor(estado);
}

function getEstadoIconSafe(estado: string) {
  if (estado === "N/N") return "⚪";
  return getEstadoIcon(estado);
}

function formatDateValue(value: any) {
  if (!value) return "-";
  return String(value);
}

function formatSampleDate(m: any) {
  if (m?.fecha_muestra) {
    return {
      value: formatDateValue(m.fecha_muestra),
      label: "Real China",
      className: getColorFechaMuestra(m.fecha_muestra, m.fecha_teorica),
    };
  }

  if (m?.fecha_teorica) {
    return {
      value: formatDateValue(m.fecha_teorica),
      label: "Teórica",
      className: getColorFechaMuestra(null, m.fecha_teorica),
    };
  }

  return {
    value: "-",
    label: "",
    className: "text-gray-400",
  };
}

function getLinePiSummary(lineas: any[] | undefined) {
  const values = Array.from(
    new Set(
      (lineas ?? [])
        .map((l) => String(l?.pi_number ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  if (values.length === 0) return "-";
  if (values.length <= 3) return values.join(" / ");

  return `${values.length} PI: ${values.slice(0, 3).join(" / ")}…`;
}

function getLineEtdSummary(lineas: any[] | undefined) {
  const values = Array.from(
    new Set(
      (lineas ?? [])
        .map((l) => String(l?.etd ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  if (values.length === 0) return "-";
  if (values.length === 1) return values[0];

  return `Próxima ${values[0]} (+${values.length - 1})`;
}

function getSampleSortIndex(value: any) {
  const normalized = normalizeSampleType(value);
  const index = SAMPLE_TYPES.indexOf(normalized as any);

  return index === -1 ? SAMPLE_TYPES.length : index;
}

function sortSamplesForDisplay(samples: any[] | undefined) {
  return [...(samples ?? [])].sort((a, b) => {
    const typeDiff =
      getSampleSortIndex(a?.tipo_muestra) - getSampleSortIndex(b?.tipo_muestra);

    if (typeDiff !== 0) return typeDiff;

    const roundA = String(a?.round ?? "").trim();
    const roundB = String(b?.round ?? "").trim();

    return roundA.localeCompare(roundB, "es", { numeric: true });
  });
}

function normalizeSampleType(value: any) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const upper = raw.toUpperCase();

  if (upper === "DEVELOPMENT") return "CFMS";
  if (SAMPLE_TYPES.includes(upper as any)) return upper;

  return raw;
}

export default function VerPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const router = useRouter();
  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPO = async () => {
      if (!id) return;

      try {
        setError(null);

        const res = await fetch(`/api/po/${id}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (res.status === 401) {
          setError("Tu sesión no está activa. Vuelve a iniciar sesión.");
          setPO(null);
          return;
        }

        if (res.status === 403) {
          setError("No tienes acceso a este PO.");
          setPO(null);
          return;
        }

        if (res.status === 404) {
          setError("No se encontró el pedido.");
          setPO(null);
          return;
        }

        if (!res.ok) {
          setError(data?.error ?? `Error cargando PO (${res.status}).`);
          setPO(null);
          return;
        }

        setPO(data);
      } catch (err) {
        console.error("❌ Error cargando PO:", err);
        setError("No se pudo cargar el PO.");
        setPO(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [id]);

  const supplierNorm = String(po?.supplier ?? "").trim().toUpperCase();
  const isBSG = supplierNorm === "BSG";

  const piSummary = useMemo(
    () => getLinePiSummary(po?.lineas_pedido),
    [po?.lineas_pedido]
  );

  const etdSummary = useMemo(
    () => getLineEtdSummary(po?.lineas_pedido),
    [po?.lineas_pedido]
  );

  if (loading) {
    return <div className="p-6 text-gray-600">Cargando pedido...</div>;
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-xl rounded-xl border border-red-200 bg-white p-5 shadow">
          <h1 className="text-lg font-semibold text-red-700">Acceso no disponible</h1>
          <p className="mt-2 text-sm text-gray-700">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!po) {
    return <div className="p-6 text-red-500">No se encontró el pedido.</div>;
  }

  const formatNumber = (n: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n || 0);

  const formatMoney = (n: number) =>
    (po.currency === "EUR" ? "€ " : "$ ") +
    new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  const formatMoneyValue = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";

    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));

    if (!Number.isFinite(n)) return String(v);

    return formatMoney(n);
  };

  const totalPairs =
    po.lineas_pedido?.reduce((acc: number, l: any) => acc + (l.qty || 0), 0) ||
    0;

  const totalAmount =
    po.lineas_pedido?.reduce(
      (acc: number, l: any) => acc + (l.qty || 0) * (l.price || 0),
      0
    ) || 0;

  const totalSelling =
    po.lineas_pedido?.reduce((acc: number, l: any) => {
      const v = l?.amount_selling;
      const n =
        typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));

      return Number.isFinite(n) ? acc + n : acc;
    }, 0) || 0;

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          📄 PO {po.po || "(sin número)"}
        </h1>

        <button
          onClick={() => router.push(`/po/${id}/editar`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-semibold"
        >
          ✏️ Editar PO
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 bg-white rounded-xl shadow p-5 border border-gray-200">
        {[
          ["Season", po.season],
          ["Factory", po.factory],
          ["ETD PI", etdSummary],
          ["Shipping", po.shipping_date],
          ["Moneda", po.currency],
          ["Customer", po.customer],
          ["P.I", piSummary],
          ["Booking", po.booking],
          ["Inspection", po.inspection],
          ["Supplier", po.supplier],
          ["PO Date", po.po_date],
          ["Closing", po.closing],
          ["Estado Insp.", po.estado_inspeccion],
        ].map(([label, value]) => (
          <div key={label as string} className="text-sm">
            <span className="font-semibold text-gray-700">{label}:</span>{" "}
            <span className="text-gray-800">{(value as any) || "-"}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          📦 Líneas de pedido
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {[
                  "Ref",
                  "Style",
                  "Color",
                  "Size",
                  "Category",
                  "Channel",
                  "Qty",
                  "Price",
                  "Total",
                  "PI línea",
                  "ETD línea",
                  "PI BSG",
                  "Selling Price",
                  "Selling Amount",
                  "Trial U",
                  "Trial L",
                  "Lasting",
                  "Finish",
                ].map((h) => (
                  <th key={h} className="px-2 py-1 border text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {po.lineas_pedido?.map((l: any, i: number) => (
                <tr key={l.id ?? i} className="border-t hover:bg-gray-50">
                  <td className="px-2 py-1 text-left">{l.reference || "-"}</td>
                  <td className="px-2 py-1">{l.style || "-"}</td>
                  <td className="px-2 py-1">{l.color || "-"}</td>
                  <td className="px-2 py-1">{l.size_run || "-"}</td>
                  <td className="px-2 py-1">{l.category || "-"}</td>
                  <td className="px-2 py-1">{l.channel || "-"}</td>

                  <td className="px-2 py-1 text-center font-medium">
                    {formatNumber(l.qty)}
                  </td>

                  <td className="px-2 py-1 text-center">
                    {formatMoney(l.price)}
                  </td>

                  <td className="px-2 py-1 text-center font-semibold text-gray-700">
                    {formatMoney((l.qty || 0) * (l.price || 0))}
                  </td>

                  <td className="px-2 py-1 text-center">
                    {String(l.pi_number ?? "").trim() || "-"}
                  </td>

                  <td className="px-2 py-1 text-center">{l.etd || "-"}</td>

                  <td className="px-2 py-1 text-center">
                    {isBSG ? String(l.pi_bsg ?? "").trim() || "-" : "—"}
                  </td>

                  <td className="px-2 py-1 text-center">
                    {isBSG ? formatMoneyValue(l.price_selling) : "—"}
                  </td>

                  <td className="px-2 py-1 text-center font-semibold text-gray-700">
                    {isBSG ? formatMoneyValue(l.amount_selling) : "—"}
                  </td>

                  <td className="px-2 py-1 text-center">
                    {l.trial_upper || "-"}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {l.trial_lasting || "-"}
                  </td>
                  <td className="px-2 py-1 text-center">{l.lasting || "-"}</td>
                  <td className="px-2 py-1 text-center">
                    {l.finish_date || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🧪 Muestras
        </h2>

        {(() => {
          const { ok, enProceso, problemas } = getResumenPO(po.lineas_pedido);

          return (
            <div className="flex gap-6 text-sm font-semibold mb-4">
              <div className="flex items-center gap-1 text-green-600">
                🟢 <span>{ok} OK</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600">
                🟡 <span>{enProceso} en proceso</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                🔴 <span>{problemas} con problemas</span>
              </div>
            </div>
          );
        })()}

        {po.lineas_pedido?.some((l: any) => l.muestras?.length) ? (
          <div className="space-y-4">
            {po.lineas_pedido.map(
              (l: any, i: number) =>
                l.muestras?.length > 0 && (
                  <div
                    key={l.id ?? i}
                    className="border rounded-lg bg-gray-50 p-3 shadow-sm hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      {l.reference || "-"} — {l.color || "-"} ({l.style || "-"})
                    </h3>

                    <table className="w-full text-sm border border-gray-200 rounded">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-2 py-1 border text-left">Tipo</th>
                          <th className="px-2 py-1 border text-center">
                            Fecha
                          </th>
                          <th className="px-2 py-1 border text-center">
                            Origen fecha
                          </th>
                          <th className="px-2 py-1 border text-center">
                            Estado
                          </th>
                          <th className="px-2 py-1 border text-center">
                            Round
                          </th>
                          <th className="px-2 py-1 border text-left">Notas</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortSamplesForDisplay(l.muestras).map((m: any, mi: number) => {
                          const estado = getDisplayEstadoMuestra(m);
                          const sampleDate = formatSampleDate(m);

                          return (
                            <tr
                              key={m.id ?? mi}
                              className={
                                isNoNeedSample(m)
                                  ? "border-t bg-gray-50 text-gray-500"
                                  : "border-t hover:bg-gray-100"
                              }
                            >
                              <td className="px-2 py-1">
                                {normalizeSampleType(m.tipo_muestra)}
                              </td>

                              <td
                                className={`px-2 py-1 text-center ${sampleDate.className}`}
                              >
                                {sampleDate.value}
                              </td>

                              <td className="px-2 py-1 text-center text-xs text-gray-500">
                                {sampleDate.label || "-"}
                              </td>

                              <td
                                className={`px-2 py-1 text-center font-medium ${getEstadoClass(
                                  estado
                                )}`}
                              >
                                {getEstadoIconSafe(estado)} {estado}
                              </td>

                              <td className="px-2 py-1 text-center">
                                {m.round || "-"}
                              </td>

                              <td className="px-2 py-1">{m.notas || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic mt-2">
            No hay muestras registradas para este pedido.
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 font-semibold text-sm flex justify-between">
        <span>📊 Total Pares: {formatNumber(totalPairs)}</span>

        <div className="flex gap-6">
          <span>Total Importe: {formatMoney(totalAmount)}</span>

          {isBSG && <span>Total Selling: {formatMoney(totalSelling)}</span>}
        </div>
      </div>

      <button
        onClick={() => router.push("/")}
        className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow text-sm"
      >
        ← Volver
      </button>
    </div>
  );
}
