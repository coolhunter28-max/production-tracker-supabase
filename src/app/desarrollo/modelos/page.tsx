// src/app/desarrollo/modelos/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ModelosList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/modelos-list");
      const json = await res.json();
      setItems(json.items || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">📚 Modelos</h1>

        <div className="flex gap-2">
          <Link
            href="/desarrollo/modelos/nuevo"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm"
          >
            ➕ Nuevo modelo
          </Link>

          <Link
            href="/desarrollo"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>
        </div>
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
              {items.map((m: any) => (
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

              {items.length === 0 ? (
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
