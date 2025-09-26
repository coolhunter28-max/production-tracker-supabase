"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PoEditar() {
  const params = useParams();
  const id = params?.id as string; // 👈 Forzamos id a string
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ========================
  // Cargar datos del PO
  // ========================
  useEffect(() => {
    if (!id) return;

    async function fetchPo() {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error cargando PO");
        setPo(data);
      } catch (err) {
        console.error(err);
        alert("❌ Error cargando el PO");
      } finally {
        setLoading(false);
      }
    }
    fetchPo();
  }, [id]);

  // ========================
  // Guardar cambios
  // ========================
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/po/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabecera: {
            etd_pi: po.etd_pi,
            shipping_date: po.shipping_date,
            booking: po.booking,
            closing: po.closing,
          },
          lineas: po.lineas_pedido,
          muestras: po.lineas_pedido.flatMap((l: any) => l.muestras || []),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando cambios");

      alert("✅ Cambios guardados correctamente");
      router.push(`/po/${id}`);
    } catch (err: any) {
      console.error(err);
      alert("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================
  // Eliminar PO
  // ========================
  async function handleDelete() {
    if (!confirm("⚠️ ¿Seguro que deseas eliminar este PO y todas sus líneas/muestras?")) {
      return;
    }

    try {
      const res = await fetch(`/api/po/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error eliminando PO");

      alert("🗑️ PO eliminado correctamente");
      router.push("/"); // volvemos al dashboard
    } catch (err: any) {
      console.error(err);
      alert("❌ " + err.message);
    }
  }

  if (loading) return <p className="p-4">Cargando...</p>;
  if (!po) return <p className="p-4">No se encontró el PO</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">✏️ Editar PO {po.po}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-semibold">ETD PI</label>
          <input
            type="date"
            value={po.etd_pi || ""}
            onChange={(e) => setPo({ ...po, etd_pi: e.target.value })}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Shipping Date</label>
          <input
            type="date"
            value={po.shipping_date || ""}
            onChange={(e) => setPo({ ...po, shipping_date: e.target.value })}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Booking</label>
          <input
            type="date"
            value={po.booking || ""}
            onChange={(e) => setPo({ ...po, booking: e.target.value })}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Closing</label>
          <input
            type="date"
            value={po.closing || ""}
            onChange={(e) => setPo({ ...po, closing: e.target.value })}
            className="border px-2 py-1 rounded w-full"
          />
        </div>
      </div>

      {/* Aquí podrías añadir edición de líneas y muestras si ya lo tenías implementado */}

      <div className="mt-6 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          💾 Guardar
        </button>
        <button
          onClick={() => router.push(`/po/${id}`)}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          ← Cancelar
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          🗑️ Eliminar PO
        </button>
      </div>
    </div>
  );
}
