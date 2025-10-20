"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VerPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id || ""; // ✅ evitamos el posible null
  const router = useRouter();
  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      if (!id) return; // ✅ no ejecutar si el id aún no está disponible
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

  if (loading) return <div className="p-6 text-gray-600">Cargando pedido...</div>;
  if (!po) return <div className="p-6 text-red-500">No se encontró el pedido.</div>;

  const formatNumber = (n: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n || 0);
  const formatMoney = (n: number) =>
    (po.currency === "EUR" ? "€ " : "$ ") +
    new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  const totalPairs =
    po.lineas_pedido?.reduce((acc: number, l: any) => acc + (l.qty || 0), 0) || 0;
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
          onClick={() => router.push(`/po/${id}/editar`)} // ✅ usa id en vez de params.id
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
          ["P.I", po.proforma_invoice],
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
                  <td className="px-2 py-1 text-center font-medium">{formatNumber(l.qty)}</td>
                  <td className="px-2 py-1 text-center">{formatMoney(l.price)}</td>
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

      {/* MUESTRAS agrupadas */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">🧪 Muestras</h2>

        {po.lineas_pedido?.some((l: any) => l.muestras?.length) ? (
          <div className="space-y-4">
            {po.lineas_pedido.map(
              (l: any, i: number) =>
                l.muestras?.length > 0 && (
                  <div
                    key={i}
                    className="border rounded-lg bg-gray-50 p-3 shadow-sm hover:shadow-md transition"
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {l.reference} — {l.color} ({l.style})
                    </h3>
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
                        {l.muestras.map((m: any, mi: number) => (
                          <tr key={mi} className="border-t hover:bg-gray-100">
                            <td className="px-2 py-1">{m.tipo_muestra}</td>
                            <td className="px-2 py-1 text-center">{m.fecha_muestra}</td>
                            <td
                              className={`px-2 py-1 text-center font-medium ${
                                m.estado_muestra === "Aprobado"
                                  ? "text-green-600"
                                  : m.estado_muestra === "Rechazado"
                                  ? "text-red-600"
                                  : "text-gray-700"
                              }`}
                            >
                              {m.estado_muestra}
                            </td>
                            <td className="px-2 py-1 text-center">{m.round || "-"}</td>
                            <td className="px-2 py-1">{m.notas || "-"}</td>
                          </tr>
                        ))}
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
