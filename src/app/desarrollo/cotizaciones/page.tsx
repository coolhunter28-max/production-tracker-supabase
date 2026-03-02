"use client";

import * as React from "react";
import Link from "next/link";

type Row = {
  id: string;
  status: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  margin_pct: number | null;
  commission_enabled: boolean;
  commission_rate: number | null;
  rounding_step: number | null;
  notes: string | null;
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

function pct(decimal: number) {
  if (!Number.isFinite(decimal)) return "0.00";
  return (decimal * 100).toFixed(2);
}

function calcGrossMarginDecimal(buy: number, sell: number) {
  const b = Number(buy);
  const s = Number(sell);
  if (!Number.isFinite(b) || b <= 0) return 0;
  if (!Number.isFinite(s)) return 0;
  return (s - b) / b;
}

// ✅ Comisión sobre BUY: beneficio = (sell-buy) + buy*rate
function calcNetMarginDecimal_BSG(buy: number, sell: number, commissionEnabled: boolean, commissionRate: number | null) {
  const b = Number(buy);
  const s = Number(sell);
  if (!Number.isFinite(b) || b <= 0) return 0;
  if (!Number.isFinite(s)) return 0;

  const rate = commissionEnabled ? Number(commissionRate ?? 0) : 0;
  const r = Number.isFinite(rate) ? rate : 0;

  const profit = (s - b) + b * r;
  return profit / b;
}

function useLocalStorageNumber(key: string, defaultValue: number) {
  const [value, setValue] = React.useState<number>(defaultValue);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      const n = Number(raw);
      if (Number.isFinite(n)) setValue(n);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
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

  // ✅ margen mínimo configurable (porcentaje)
  const [minMarginPct, setMinMarginPct] = useLocalStorageNumber("pt_min_margin_pct", 20);
  const [onlyLowMargin, setOnlyLowMargin] = React.useState(false);

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

      const list = Array.isArray(json?.data) ? (json.data as Row[]) : [];
      setRows(list);
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

  const minMarginDecimal = Math.max(0, Number(minMarginPct) || 0) / 100;

  // ✅ margen de “alerta”: neto si comisión ON, si no bruto
  function calcAlertMarginDecimal(r: Row) {
    const gross = calcGrossMarginDecimal(Number(r.buy_price), Number(r.sell_price));
    const net = calcNetMarginDecimal_BSG(
      Number(r.buy_price),
      Number(r.sell_price),
      Boolean(r.commission_enabled),
      r.commission_rate
    );
    return r.commission_enabled ? net : gross;
  }

  const filteredRows = React.useMemo(() => {
    if (!onlyLowMargin) return rows;
    return rows.filter((r) => calcAlertMarginDecimal(r) < minMarginDecimal);
  }, [rows, onlyLowMargin, minMarginDecimal]);

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
                <option key={c} value={c}>{c}</option>
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
                <option key={s} value={s}>{s}</option>
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

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-sm">Margen mínimo (%)</label>
            <input
              value={String(minMarginPct)}
              onChange={(e) => {
                const n = Number(String(e.target.value).replace(",", "."));
                if (Number.isFinite(n)) setMinMarginPct(n);
                else if (e.target.value === "") setMinMarginPct(0);
              }}
              className="border rounded px-3 py-2 w-full"
              placeholder="20"
            />
            <div className="text-xs text-gray-500 mt-1">Se guarda en tu navegador (local).</div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" checked={onlyLowMargin} onChange={(e) => setOnlyLowMargin(e.target.checked)} />
            <div className="text-sm text-gray-700">
              Solo bajo margen (&lt; {Number(minMarginPct || 0).toFixed(2)}%)
            </div>
          </div>

          <div className="flex gap-2 items-center justify-end">
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
          </div>
        </div>

        {msg ? <div className="text-sm text-red-700">{msg}</div> : null}
      </div>

      <div className="bg-white p-5 rounded-xl shadow border">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Resultados</div>
          <div className="text-xs text-gray-500">
            {filteredRows.length} registro(s){onlyLowMargin ? " (filtrado)" : ""}
          </div>
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
                <th className="py-2 pr-3">Margen bruto %</th>
                <th className="py-2 pr-3">Margen neto %</th>
                <th className="py-2 pr-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const gross = calcGrossMarginDecimal(Number(r.buy_price), Number(r.sell_price));
                const net = calcNetMarginDecimal_BSG(
                  Number(r.buy_price),
                  Number(r.sell_price),
                  Boolean(r.commission_enabled),
                  r.commission_rate
                );

                const alertMargin = r.commission_enabled ? net : gross;
                const low = alertMargin < minMarginDecimal;

                return (
                  <tr key={r.id} className={`border-b hover:bg-gray-50 ${low ? "bg-red-50" : ""}`}>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <Link href={`/desarrollo/cotizaciones/${r.id}`} className="text-blue-700 hover:underline">
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

                    <td className="py-2 pr-3">{pct(gross)}%</td>

                    <td className={`py-2 pr-3 font-semibold ${low ? "text-red-700" : "text-gray-900"}`}>
                      {pct(net)}%
                      {low ? <span className="ml-2 text-xs">(bajo mín.)</span> : null}
                      {!r.commission_enabled ? <span className="ml-2 text-xs text-gray-500">(sin comisión)</span> : null}
                    </td>

                    <td className="py-2 pr-3">{r.created_by || "-"}</td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-gray-600">
                    No hay resultados con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 mt-3 space-y-1">
          <div><b>Margen bruto</b> = (Sell - Buy) / Buy</div>
          <div><b>Margen neto (BSG)</b> = ((Sell - Buy) + Buy × comisión) / Buy (si comisión ON)</div>
          <div>La alerta y el filtro “bajo margen” usan margen neto si comisión está activa.</div>
        </div>
      </div>
    </div>
  );
}