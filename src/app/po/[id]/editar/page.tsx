"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EditarPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string; // ✅ forzamos a string, nunca null

  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error cargando PO");
        setPO(data);
      } catch (e) {
        console.error("❌ Error cargando PO:", e);
        setPO(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [id]);

  if (loading) return <div>Cargando...</div>;
  if (!po) return <div>No se encontró el PO</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar PO</h1>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>Cliente:</strong> {po.customer}</div>
        <div><strong>Proveedor:</strong> {po.supplier}</div>
        <div><strong>Factory:</strong> {po.factory}</div>
        <div><strong>Canal:</strong> {po.channel}</div>
        <div><strong>PO Date:</strong> {po.po_date}</div>
        <div><strong>ETD PI:</strong> {po.etd_pi}</div>
        <div><strong>Booking:</strong> {po.booking}</div>
        <div><strong>Closing:</strong> {po.closing}</div>
        <div><strong>Shipping Date:</strong> {po.shipping_date}</div>
      </div>

      <h2 className="text-xl font-semibold mt-4">Líneas de pedido</h2>
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Referencia</th>
            <th className="p-2 border">Style</th>
            <th className="p-2 border">Color</th>
            <th className="p-2 border">Size</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Price</th>
            <th className="p-2 border">Amount</th>
          </tr>
        </thead>
        <tbody>
          {po.lineas_pedido?.map((l: any) => (
            <tr key={l.id} className="border-t">
              <td className="p-2 border">{l.reference}</td>
              <td className="p-2 border">{l.style}</td>
              <td className="p-2 border">{l.color}</td>
              <td className="p-2 border">{l.size_run}</td>
              <td className="p-2 border">{l.qty}</td>
              <td className="p-2 border">{l.price}</td>
              <td className="p-2 border">{l.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
