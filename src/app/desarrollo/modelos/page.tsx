"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ModelosList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modelos-list", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items || []);
    } catch (e) {
      console.error("Error cargando modelos:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((m: any) => {
      const style = String(m.style || "").toLowerCase();
      const customer = String(m.customer || "").toLowerCase();
      const supplier = String(m.supplier || "").toLowerCase();
      return style.includes(t) || customer.includes(t) || supplier.includes(t);
    });
  }, [items, q]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">📚 Modelos</h1>
          <p className="text-sm text-gray-600">
            Fichas de modelos · imágenes · variantes · precios · composiciones
          </p>
        </div>

        <div className="flex gap-2">
          {/* ✅ NUEVO: crear modelo */}
          <Link
            href="/desarrollo/modelos/nuevo"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm"
          >
            + Nuevo modelo
          </Link>

          <Link
            href="/desarrollo"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            ← Volver
          </Link>
        </div>
      </div>

      {/* ✅ NUEVO: buscador + recargar */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por style / customer / supplier…"
          className="w-full md:max-w-md border rounded px-3 py-2 text-sm"
        />

        <button
          onClick={load}
          className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          ↻ Recargar
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Cargando…</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Style</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Supplier</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: any) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-semibold">{m.style}</td>
                  <td className="p-3">{m.customer || "-"}</td>
                  <td className="p-3">{m.supplier || "-"}</td>
                  <td className="p-3">{m.status || "-"}</td>
                  <td className="p-3">
                    <Link
                      href={`/desarrollo/modelos/${m.id}`}
                      className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    No hay modelos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
