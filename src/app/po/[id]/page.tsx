"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VerPO() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string; // ✅ aseguramos string

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
      <h1 className="text-2xl font-semibold">Detalles del PO</h1>

      <div>
        <strong>Cliente:</strong> {po.customer} |{" "}
        <strong>Proveedor:</strong> {po.supplier} <br />
        <strong>Fábrica:</strong> {po.factory} |{" "}
        <strong>Canal:</strong> {po.channel}
      </div>

      <h2 className="text-xl font-semibold mt-4">Líneas de pedido</h2>
      {po.lineas_pedido?.map((l: any) => (
        <div key={l.id} className="border p-2 rounded mb-2">
          <strong>Referencia:</strong> {l.reference} ·{" "}
          <strong>Style:</strong> {l.style} <br />
          <strong>Color:</strong> {l.color} · <strong>Size:</strong>{" "}
          {l.size_run} <br />
          <strong>Qty:</strong> {l.qty} · <strong>Amount:</strong> {l.amount}
          <br />
          {l.muestras?.length > 0 && (
            <div className="mt-2">
              <strong>Muestras:</strong>
              <ul className="list-disc list-inside">
                {l.muestras.map((m: any) => (
                  <li key={m.id}>
                    {m.tipo_muestra} - {m.fecha_muestra} ({m.estado_muestra}) ·
                    Ronda {m.round}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => router.push(`/po/${id}/editar`)}
      >
        Editar PO
      </button>
    </div>
  );
}
