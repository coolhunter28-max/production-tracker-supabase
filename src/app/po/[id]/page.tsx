"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PoDetalle() {
  const params = useParams();
  const id = params?.id as string; // 👈 Forzamos id a string
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchPo() {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();
        setPo(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPo();
  }, [id]);

  if (loading) return <p className="p-4">Cargando...</p>;
  if (!po) return <p className="p-4">No se encontraron detalles para este PO.</p>;

  const total = po.lineas_pedido?.reduce(
    (sum: number, l: any) => sum + (Number(l.amount) || 0),
    0
  );

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Detalles del PO {po.po}</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><b>Proveedor:</b> {po.supplier}</div>
        <div><b>Cliente:</b> {po.customer}</div>
        <div><b>Factory:</b> {po.factory}</div>
        <div><b>Canal:</b> {po.channel}</div>
        <div><b>PO Date:</b> {po.po_date || "-"}</div>
        <div><b>ETD PI:</b> {po.etd_pi || "-"}</div>
        <div><b>Booking:</b> {po.booking || "-"}</div>
        <div><b>Closing:</b> {po.closing || "-"}</div>
        <div><b>Shipping Date:</b> {po.shipping_date || "-"}</div>
      </div>

      <h2 className="font-semibold mb-2">Líneas de pedido</h2>
      <table className="w-full border text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th>Referencia</th>
            <th>Style</th>
            <th>Color</th>
            <th>Size Run</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Trial Upper</th>
            <th>Trial Lasting</th>
            <th>Lasting</th>
            <th>Finish Date</th>
            <th>Inspection</th>
            <th>Estado Inspección</th>
          </tr>
        </thead>
        <tbody>
          {po.lineas_pedido?.map((l: any) => (
            <tr key={l.id} className="border-t">
              <td>{l.reference}</td>
              <td>{l.style}</td>
              <td>{l.color}</td>
              <td>{l.size_run}</td>
              <td>{l.qty}</td>
              <td>{formatUSD(l.price)}</td>
              <td>{formatUSD(l.amount)}</td>
              <td>{l.category}</td>
              <td>{l.trial_upper || "-"}</td>
              <td>{l.trial_lasting || "-"}</td>
              <td>{l.lasting || "-"}</td>
              <td>{l.finish_date || "-"}</td>
              <td>{l.inspection || "-"}</td>
              <td>{l.estado_inspeccion || "-"}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={6}>TOTAL</td>
            <td>{formatUSD(total)}</td>
            <td colSpan={7}></td>
          </tr>
        </tbody>
      </table>

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
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Round</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {l.muestras.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td>{m.tipo_muestra}</td>
                    <td>
                      {m.fecha_muestra
                        ? new Date(m.fecha_muestra).toLocaleDateString()
                        : m.fecha_teorica
                        ? `(Est.) ${new Date(m.fecha_teorica).toLocaleDateString()}`
                        : "-"}
                    </td>
                    <td>{m.estado_muestra}</td>
                    <td>{m.round}</td>
                    <td>{m.notas || "-"}</td>
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
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => router.push(`/po/${id}/editar`)}
        >
          ✏️ Editar PO
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded"
          onClick={() => router.push("/")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}
