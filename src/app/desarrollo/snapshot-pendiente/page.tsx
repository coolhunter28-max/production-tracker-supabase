"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  po_id: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qty: number;
  price: number | null;
  price_selling: number | null;
  modelo_id: string | null;
  variante_id: string | null;
  master_price_id_used: string | null;
  pos?: {
    id: string;
    po: string;
    season: string;
    supplier: string;
    customer: string;
    factory: string;
    po_date: string | null;
  } | null;
};

export default function SnapshotPendientePage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [season, setSeason] = useState("");
  const [supplier, setSupplier] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/lineas-sin-snapshot?limit=1000");
    const json = await res.json();
    setItems(json.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((r) => {
      const po = r.pos?.po || "";
      const st = r.style || "";
      const rf = r.reference || "";
      const cl = r.color || "";
      const se = r.pos?.season || "";
      const su = r.pos?.supplier || "";

      const matchQ =
        !qq ||
        po.toLowerCase().includes(qq) ||
        st.toLowerCase().includes(qq) ||
        rf.toLowerCase().includes(qq) ||
        cl.toLowerCase().includes(qq);

      const matchSeason = !season || se === season;
      const matchSupplier = !supplier || su === supplier;

      return matchQ && matchSeason && matchSupplier;
    });
  }, [items, q, season, supplier]);

  const seasons = useMemo(() => {
    return Array.from(new Set(items.map((r) => r.pos?.season).filter(Boolean) as string[])).sort();
  }, [items]);

  const suppliers = useMemo(() => {
    return Array.from(new Set(items.map((r) => r.pos?.supplier).filter(Boolean) as string[])).sort();
  }, [items]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">🧾 Líneas sin snapshot de precio</h1>

        <div className="flex gap-2">
          <Link
            href="/desarrollo"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </Link>

          <button
            onClick={load}
            className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition text-sm"
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border px-3 py-2 rounded"
          placeholder="Buscar PO / style / reference / color"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select className="border px-3 py-2 rounded" value={season} onChange={(e) => setSeason(e.target.value)}>
          <option value="">Season</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select className="border px-3 py-2 rounded" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
          <option value="">Supplier</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="text-sm flex items-center">
          {loading ? "Cargando…" : `${filtered.length} de ${items.length}`}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">PO</th>
              <th className="text-left p-3">Season</th>
              <th className="text-left p-3">Style</th>
              <th className="text-left p-3">Color</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">modelo_id</th>
              <th className="text-left p-3">variante_id</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.pos?.po || "-"}</td>
                <td className="p-3">{r.pos?.season || "-"}</td>
                <td className="p-3 font-semibold">{r.style || "-"}</td>
                <td className="p-3">{r.color || "-"}</td>
                <td className="p-3">{r.price ?? "-"}</td>
                <td className="p-3">{r.modelo_id ? "✅" : "❌"}</td>
                <td className="p-3">{r.variante_id ? "✅" : "❌"}</td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600">
        Nota: Si muchas filas muestran ❌ en modelo/variante, el fix es backfill. Si están ✅✅ pero sigue sin snapshot, el fix
        es que falta precio master vigente para esa variante/season.
      </div>
    </div>
  );
}
