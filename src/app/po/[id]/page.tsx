"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VerPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [po, setPO] = useState<any>(null);
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

  if (loading) return <div>Cargando...</div>;
  if (!po) return <div>No se encontró el PO</div>;

  // 🔹 Formateo de moneda
  const formatCurrency = (value: number) => {
    if (po.currency === "EUR") {
      return `€ ${value.toFixed(2)}`;
    }
    return `$ ${value.toFixed(2)}`;
  };

  // 🔹 Totales
  const totalQty = po.lineas_pedido?.reduce((sum: number, l: any) => sum + (l.qty || 0), 0) || 0;
  const totalAmount =
    po.lineas_pedido?.reduce((sum: number, l: any) => sum + (l.qty || 0) * (l.price || 0), 0) || 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📄 Detalles del PO {po.po}</h1>

      {/* 🔹 Cabecera */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <p><strong>Customer:</strong> {po.customer}</p>
        <p><strong>Supplier:</strong> {po.supplier}</p>
        <p><strong>Factory:</strong> {po.factory}</p>
        <p><strong>Category:</strong> {po.category}</p>
        <p><strong>P.I:</strong> {po.proforma_invoice}</p>
        <p><strong>PI Date:</strong> {po.po_date}</p>
        <p><strong>ETD PI:</strong> {po.etd_pi}</p>
        <p><strong>Booking:</strong> {po.booking}</p>
        <p><strong>Closing:</strong> {po.closing}</p>
        <p><strong>Shipping:</strong> {po.shipping_date}</p>
        <p><strong>Inspection:</strong> {po.inspection}</p>
        <p><strong>Estado Insp.:</strong> {po.estado_inspeccion}</p>
        <p><strong>Moneda:</strong> {po.currency || "USD"}</p>
      </div>

      {/* 🔹 Líneas de pedido */}
      <div>
        <h2 className="text-md font-bold mb-2">📦 Líneas de pedido</h2>
        {po.lineas_pedido?.map((l: any, i: number) => (
          <div key={i} className="mb-6 border p-2 rounded bg-gray-50">
            <table className="table-auto text-xs w-full border text-center">
              <thead className="bg-gray-200">
                <tr>
                  <th>Ref</th>
                  <th>Style</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Trial U</th>
                  <th>Trial L</th>
                  <th>Lasting</th>
                  <th>Finish</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{l.reference}</td>
                  <td>{l.style}</td>
                  <td>{l.color}</td>
                  <td>{l.size_run}</td>
                  <td>{l.qty}</td>
                  <td>{formatCurrency(l.price || 0)}</td>
                  <td className="font-semibold">{formatCurrency((l.qty || 0) * (l.price || 0))}</td>
                  <td>{l.trial_upper}</td>
                  <td>{l.trial_lasting}</td>
                  <td>{l.lasting}</td>
                  <td>{l.finish_date}</td>
                </tr>
              </tbody>
            </table>

            {/* 🔹 Muestras */}
            {l.muestras && l.muestras.length > 0 && (
              <>
                <h3 className="font-semibold mt-2">🧪 Muestras de {l.reference}</h3>
                <table className="table-auto text-xs w-full border text-center">
                  <thead className="bg-gray-100">
                    <tr>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Round</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.muestras.map((m: any, mi: number) => (
                      <tr key={mi} className="border-t">
                        <td>{m.tipo_muestra}</td>
                        <td>{m.fecha_muestra}</td>
                        <td>{m.estado_muestra}</td>
                        <td>{m.round}</td>
                        <td>{m.notas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}

        {/* 🔹 Resumen Totales */}
        <div className="border p-3 rounded bg-gray-100 text-sm mt-4">
          <p><strong>👟 Total Pares:</strong> {totalQty}</p>
          <p><strong>💰 Total Importe:</strong> {formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* 🔹 Botones */}
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
