"use client";

import * as React from "react";
import Link from "next/link";

type Row = {
  id: string;
  status: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  created_by: string | null;
  created_at: string;
  modelos: { style: string; reference: string | null; customer: string | null } | null;
  modelo_variantes: { season: string; color: string; reference: string } | null;
};

function formatMoney(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CotizacionesListPage() {
  const [q, setQ] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [season, setSeason] = React.useState("");
  const [status, setStatus] = React.useState("");

  const [customerOptions, setCustomerOptions] = React.useState<string[]>([]);
  const [seasonOptions, setSeasonOptions] = React.useState<string[]>([]);
  const [metaLoading, setMetaLoading] = React.useState(false);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function loadMeta() {
    setMetaLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/cotizaciones/meta/customers"),
        fetch("/api/cotizaciones/meta/seasons"),
      ]);

      const cJson = await cRes.json();
      const sJson = await sRes.json();

      if (cRes.ok) setCustomerOptions(Array.isArray(cJson?.data) ? cJson.data : []);
      if (sRes.ok) setSeasonOptions(Array.isArray(sJson?.data) ? sJson.data : []);
    } finally {
      setMetaLoading(false);
    }
  }

  async function buscar() {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (customer.trim()) params.set("customer", customer.trim());
      if (season.trim()) params.set("season", season.trim());
      if (status.trim()) params.set("status", status.trim());
      params.set("limit", "100");
      params.set("offset", "0");

      const res = await fetch(`/api/cotizaciones/list?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando cotizaciones");
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setRows([]);
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadMeta();
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧾 Cotizaciones</h1>
        <div className="flex gap-2">
          <Link href="/desarrollo" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            ← Desarrollo
          </Link>
          <Link href="/desarrollo/calculadora" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            + Nueva cotización
          </Link>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border space-y-4">
        <div className="font-semibold">Filtros</div>

        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm">Buscar (style / reference)</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder="Ej: POINTE"
            />
          </div>

          <div>
            <label className="text-sm">Customer</label>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? "Cargando..." : "(todos)"}</option>
              {customerOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? "Cargando..." : "(todas)"}</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="">(todos)</option>
              <option value="enviada">enviada</option>
              <option value="negociando">negociando</option>
              <option value="aceptada">aceptada</option>
              <option value="rechazada">rechazada</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={buscar}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={loading}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>

          <button
            onClick={loadMeta}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
            disabled={metaLoading}
            title="Recargar listas de customer/season"
          >
            {metaLoading ? "Cargando..." : "Recargar listas"}
          </button>

          {msg ? <div className="text-sm text-red-700">{msg}</div> : null}
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Resultados</div>
          <div className="text-xs text-gray-500">{rows.length} registro(s)</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Style</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2 pr-3">Color</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Buy</th>
                <th className="py-2 pr-3">Sell</th>
                <th className="py-2 pr-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <Link
                      href={`/desarrollo/cotizaciones/${r.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {fmtDate(r.created_at)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{r.modelos?.customer || "-"}</td>
                  <td className="py-2 pr-3">{r.modelos?.style || "-"}</td>
                  <td className="py-2 pr-3">{r.modelo_variantes?.season || "-"}</td>
                  <td className="py-2 pr-3">{r.modelo_variantes?.color || "-"}</td>
                  <td className="py-2 pr-3">
                    <span className="px-2 py-1 rounded bg-gray-100 border">{r.status}</span>
                  </td>
                  <td className="py-2 pr-3">${formatMoney(r.buy_price)}</td>
                  <td className="py-2 pr-3 font-semibold">${formatMoney(r.sell_price)}</td>
                  <td className="py-2 pr-3">{r.created_by || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-600">
                    No hay resultados con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}