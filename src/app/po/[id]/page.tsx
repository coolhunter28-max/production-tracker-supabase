"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TMuestra = {
  id?: string;
  tipo_muestra?: string;
  fecha_muestra?: string;
  estado_muestra?: string;
  round?: string;
  notas?: string;
};

type TLinea = {
  id?: string;
  reference?: string;
  style?: string;
  color?: string;
  size_run?: string;
  category?: string;
  channel?: string;
  qty?: number;
  price?: number;
  trial_upper?: string;
  trial_lasting?: string;
  lasting?: string;
  finish_date?: string;
  muestras?: TMuestra[];
};

type TPO = {
  id?: string;
  season?: string;
  po?: string;
  customer?: string;
  supplier?: string;
  factory?: string;
  proforma_invoice?: string;
  po_date?: string;
  etd_pi?: string;
  booking?: string;
  closing?: string;
  shipping_date?: string;
  inspection?: string;
  estado_inspeccion?: string;
  currency?: "USD" | "EUR";
  lineas_pedido?: TLinea[];
};

export default function VerPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [po, setPO] = useState<TPO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
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
    if (id) fetchPO();
  }, [id]);

  const fmt = (v: number) =>
    (po?.currency === "EUR" ? "€ " : "$ ") +
    v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="p-4">Cargando...</div>;
  if (!po) return <div className="p-4">No se encontró el PO</div>;

  const totalPairs =
    po.lineas_pedido?.reduce((a, l) => a + (l.qty || 0), 0) ?? 0;
  const totalAmount =
    po.lineas_pedido?.reduce(
      (a, l) => a + (l.qty || 0) * (l.price || 0),
      0
    ) ?? 0;

  return (
    <div className="p-6 space-y-6 text-sm">
      <h1 className="text-xl font-bold">📄 PO {po.po}</h1>

      {/* CABECERA */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 border p-4 rounded bg-gray-50">
        <p><strong>Season:</strong> {po.season}</p>
        <p><strong>Customer:</strong> {po.customer}</p>
        <p><strong>Supplier:</strong> {po.supplier}</p>

        <p><strong>Factory:</strong> {po.factory}</p>
        <p><strong>P.I:</strong> {po.proforma_invoice}</p>
        <p><strong>PO Date:</strong> {po.po_date}</p>

        <p><strong>ETD PI:</strong> {po.etd_pi}</p>
        <p><strong>Booking:</strong> {po.booking}</p>
        <p><strong>Closing:</strong> {po.closing}</p>

        <p><strong>Shipping:</strong> {po.shipping_date}</p>
        <p><strong>Inspection:</strong> {po.inspection}</p>
        <p><strong>Estado Insp.:</strong> {po.estado_inspeccion}</p>

        <p><strong>Moneda:</strong> {po.currency}</p>
      </div>

      {/* LÍNEAS DE PEDIDO */}
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-1">
          📦 Líneas de pedido
        </h2>

        {po.lineas_pedido?.map((l, i) => (
          <div key={i} className="border rounded-lg p-3 mb-4 bg-white shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100 border-b text-center font-semibold">
                <tr>
                  <th className="border px-2 py-1">Ref</th>
                  <th className="border px-2 py-1">Style</th>
                  <th className="border px-2 py-1">Color</th>
                  <th className="border px-2 py-1">Size</th>
                  <th className="border px-2 py-1">Category</th>
                  <th className="border px-2 py-1">Channel</th>
                  <th className="border px-2 py-1 text-right">Qty</th>
                  <th className="border px-2 py-1 text-right">Price</th>
                  <th className="border px-2 py-1 text-right">Total</th>
                  <th className="border px-2 py-1">Trial U</th>
                  <th className="border px-2 py-1">Trial L</th>
                  <th className="border px-2 py-1">Lasting</th>
                  <th className="border px-2 py-1">Finish</th>
                </tr>
              </thead>
              <tbody className="text-center">
                <tr>
                  <td className="border px-2 py-1">{l.reference}</td>
                  <td className="border px-2 py-1">{l.style}</td>
                  <td className="border px-2 py-1">{l.color}</td>
                  <td className="border px-2 py-1">{l.size_run}</td>
                  <td className="border px-2 py-1">{l.category}</td>
                  <td className="border px-2 py-1">{l.channel}</td>
                  <td className="border px-2 py-1 text-right">
                    {l.qty?.toLocaleString("es-ES")}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    {fmt(l.price || 0)}
                  </td>
                  <td className="border px-2 py-1 text-right font-semibold">
                    {fmt((l.qty || 0) * (l.price || 0))}
                  </td>
                  <td className="border px-2 py-1">{l.trial_upper}</td>
                  <td className="border px-2 py-1">{l.trial_lasting}</td>
                  <td className="border px-2 py-1">{l.lasting}</td>
                  <td className="border px-2 py-1">{l.finish_date}</td>
                </tr>
              </tbody>
            </table>

            {/* MUESTRAS */}
            {l.muestras && l.muestras.length > 0 && (
              <div className="mt-3">
                <h3 className="font-semibold mb-1 flex items-center gap-1">
                  🧪 Muestras de {l.reference}
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-100 border-b text-center font-semibold">
                    <tr>
                      <th className="border px-2 py-1">Tipo</th>
                      <th className="border px-2 py-1">Fecha</th>
                      <th className="border px-2 py-1">Estado</th>
                      <th className="border px-2 py-1">Round</th>
                      <th className="border px-2 py-1">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    {l.muestras.map((m, mi) => (
                      <tr key={mi}>
                        <td className="border px-2 py-1">{m.tipo_muestra}</td>
                        <td className="border px-2 py-1">{m.fecha_muestra}</td>
                        <td className="border px-2 py-1">{m.estado_muestra}</td>
                        <td className="border px-2 py-1">{m.round}</td>
                        <td className="border px-2 py-1">{m.notas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {/* Totales */}
        <div className="p-3 bg-gray-100 rounded border text-sm font-semibold text-right">
          📊 Total Pares: {totalPairs.toLocaleString("es-ES")} · Total Importe: {fmt(totalAmount)}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/po/${id}/editar`)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          ✏️ Editar PO
        </button>
        <button
          onClick={() => router.push("/")}
          className="bg-gray-300 px-3 py-1 rounded text-sm"
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}
