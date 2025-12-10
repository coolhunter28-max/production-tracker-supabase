"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 🟦 NUEVO: importamos nuestras funciones oficiales
import { getEstadoMuestra } from "@/utils/getEstadoMuestra";
import { getEstadoColor, getEstadoIcon } from "@/utils/getEstadoColor";
import { getSemaforoLinea } from "@/utils/getSemaforoLinea"; // ← IMPORT CORRECTO
import { getResumenPO } from "@/utils/getResumenPO";
import { getColorFechaMuestra } from "@/utils/getColorFechaMuestra";

export default function VerPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const router = useRouter();
  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();
        setPO(data);
      } catch (err) {
        console.error("❌ Error cargando PO:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [id]);

  if (loading)
    return <div className="p-6 text-gray-600">Cargando pedido...</div>;
  if (!po)
    return (
      <div className="p-6 text-red-500">
        No se encontró el pedido.
      </div>
    );

  const formatNumber = (n: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
      n || 0
    );

  const formatMoney = (n: number) =>
    (po.currency === "EUR" ? "€ " : "$ ") +
    new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  // 📌 Fecha: si hay real → real; si no → teórica (TEÓRICA)
  const formatSampleDate = (m: any) => {
    if (m.fecha_muestra) return m.fecha_muestra;
    if (m.fecha_teorica) return `${m.fecha_teorica} (TEÓRICA)`;
    return "-";
  };

  // Totales Numéricos
  const totalPairs =
    po.lineas_pedido?.reduce(
      (acc: number, l: any) => acc + (l.qty || 0),
      0
    ) || 0;

  const totalAmount =
    po.lineas_pedido?.reduce(
      (acc: number, l: any) => acc + (l.qty || 0) * (l.price || 0),
      0
    ) || 0;

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* CABECERA */}
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

      {/* DATOS PRINCIPALES */}
      <div className="grid md:grid-cols-3 gap-4 bg-white rounded-xl shadow p-5 border border-gray-200">
        {[
          ["Season", po.season],
          ["Factory", po.factory],
          ["ETD PI", po.etd_pi],
          ["Shipping", po.shipping_date],
          ["Moneda", po.currency],
          ["Customer", po.customer],
          ["P.I", po.pi],
          ["Booking", po.booking],
          ["Inspection", po.inspection],
          ["Supplier", po.supplier],
          ["PO Date", po.po_date],
          ["Closing", po.closing],
          ["Estado Insp.", po.estado_inspeccion],
        ].map(([label, value]) => (
          <div key={label} className="text-sm">
            <span className="font-semibold text-gray-700">{label}:</span>{" "}
            <span className="text-gray-800">{value || "-"}</span>
          </div>
        ))}
      </div>

      {/* LÍNEAS DE PEDIDO */}
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
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-2 py-1 text-left">{l.reference}</td>
                  <td className="px-2 py-1">{l.style}</td>
                  <td className="px-2 py-1">{l.color}</td>
                  <td className="px-2 py-1">{l.size_run}</td>
                  <td className="px-2 py-1">{l.category}</td>
                  <td className="px-2 py-1">{l.channel}</td>
                  <td className="px-2 py-1 text-center font-medium">
                    {formatNumber(l.qty)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {formatMoney(l.price)}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-gray-700">
                    {formatMoney((l.qty || 0) * (l.price || 0))}
                  </td>
                  <td className="px-2 py-1 text-center">{l.trial_upper || "-"}</td>
                  <td className="px-2 py-1 text-center">{l.trial_lasting || "-"}</td>
                  <td className="px-2 py-1 text-center">{l.lasting || "-"}</td>
                  <td className="px-2 py-1 text-center">{l.finish_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MUESTRAS */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🧪 Muestras
        </h2>
{(() => {
  const { ok, enProceso, problemas } = getResumenPO(po.lineas_pedido);

  return (
    <div className="flex gap-6 text-sm font-semibold mb-4">

      {/* OK */}
      <div className="flex items-center gap-1 text-green-600">
        🟢 <span>{ok} OK</span>
      </div>

      {/* En proceso */}
      <div className="flex items-center gap-1 text-yellow-600">
        🟡 <span>{enProceso} en proceso</span>
      </div>

      {/* Problemas */}
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
                    key={i}
                    className="border rounded-lg bg-gray-50 p-3 shadow-sm hover:shadow-md transition"
                  >
                    {/* 🟢 SEMÁFORO GLOBAL POR LÍNEA */}
                    {(() => {
                      const semaforo = getSemaforoLinea(l.muestras);

                      return (
                        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          {l.reference} — {l.color} ({l.style})
                          <span className="text-sm flex items-center gap-1">
                            {semaforo.icon}
                            <span
                              className={
                                semaforo.color === "red"
                                  ? "text-red-600 font-bold"
                                  : semaforo.color === "yellow"
                                  ? "text-yellow-600 font-semibold"
                                  : semaforo.color === "green"
                                  ? "text-green-600 font-bold"
                                  : "text-gray-500"
                              }
                            >
                              {semaforo.estado}
                            </span>
                          </span>
                        </h3>
                      );
                    })()}

                    <table className="w-full text-sm border border-gray-200 rounded">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-2 py-1 border text-left">Tipo</th>
                          <th className="px-2 py-1 border text-center">Fecha</th>
                          <th className="px-2 py-1 border text-center">Estado</th>
                          <th className="px-2 py-1 border text-center">Round</th>
                          <th className="px-2 py-1 border text-left">Notas</th>
                        </tr>
                      </thead>

                      <tbody>
                        {l.muestras.map((m: any, mi: number) => {

                          const estado = getEstadoMuestra({
                            fecha_muestra: m.fecha_muestra,
                            fecha_teorica: m.fecha_teorica,
                            approval_text: m.notas,
                          });

                          return (
                            <tr key={mi} className="border-t hover:bg-gray-100">
                              <td className="px-2 py-1">{m.tipo_muestra}</td>

                              <td
  className={`px-2 py-1 text-center ${getColorFechaMuestra(
    m.fecha_muestra,
    m.fecha_teorica
  )}`}
>
  {formatSampleDate(m)}
</td>


                              <td
                                className={`px-2 py-1 text-center font-medium ${getEstadoColor(
                                  estado
                                )}`}
                              >
                                {getEstadoIcon(estado)} {estado}
                              </td>

                              <td className="px-2 py-1 text-center">
                                {m.round || "-"}
                              </td>

                              <td className="px-2 py-1">
                                {m.notas || "-"}
                              </td>
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

      {/* TOTALES */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 font-semibold text-sm flex justify-between">
        <span>📊 Total Pares: {formatNumber(totalPairs)}</span>
        <span>Total Importe: {formatMoney(totalAmount)}</span>
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
