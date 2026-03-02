"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function toNumber(value: string, fallback = 0) {
  const v = Number(String(value).replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function formatPctDecimal(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return (value * 100).toFixed(2);
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function calcGrossMarginDecimal(buy: number, sell: number) {
  if (!Number.isFinite(buy) || buy <= 0) return 0;
  if (!Number.isFinite(sell)) return 0;
  return (sell - buy) / buy; // (Sell-Buy)/Buy
}

// ✅ BSG: comisión sobre BUY y SIEMPRE se cobra si está activa
// Beneficio neto = (Sell-Buy) + (Buy*rate)
// Margen neto = Beneficio neto / Buy
function calcNetProfitAndMargin_BSG(
  buy: number,
  sell: number,
  commissionEnabled: boolean,
  commissionRateDecimal: number
) {
  const b = Number(buy);
  const s = Number(sell);

  if (!Number.isFinite(b) || b <= 0 || !Number.isFinite(s)) {
    return { profit: 0, margin: 0, commission: 0 };
  }

  const r = commissionEnabled && Number.isFinite(commissionRateDecimal) ? commissionRateDecimal : 0;
  const commission = b * r;
  const profit = (s - b) + commission;
  const margin = profit / b;

  return { profit, margin, commission };
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

type Detail = {
  id: string;
  modelo_id: string | null;
  variante_id: string;
  status: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  commission_enabled: boolean;
  commission_rate: number | null; // decimal: 0.10
  rounding_step: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  modelos: { style: string; reference: string | null; customer: string | null } | null;
  modelo_variantes: { season: string; color: string; reference: string } | null;
};

type Round = {
  id: string;
  variante_id: string;
  status: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  commission_enabled: boolean;
  commission_rate: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export default function CotizacionDetailPage({ params }: { params: { cotizacionId: string } }) {
  const router = useRouter();
  const id = params.cotizacionId;

  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [msg, setMsg] = React.useState("");

  // editable
  const [status, setStatus] = React.useState("enviada");
  const [buyPrice, setBuyPrice] = React.useState("0");
  const [sellPrice, setSellPrice] = React.useState("0");
  const [notes, setNotes] = React.useState("");

  // promover
  const [promote, setPromote] = React.useState(false);
  const [validFrom, setValidFrom] = React.useState(todayYYYYMMDD());

  // acciones
  const [saving, setSaving] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);

  // histórico por variante
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [roundsLoading, setRoundsLoading] = React.useState(false);

  // margen mínimo global (ya lo tienes en listado)
  const [minMarginPct] = useLocalStorageNumber("pt_min_margin_pct", 20);
  const minMarginDecimal = Math.max(0, Number(minMarginPct) || 0) / 100;

  // ✅ Simulación de comisión (solo vista)
  const [simCommission, setSimCommission] = React.useState(false);
  const [simCommissionPct, setSimCommissionPct] = React.useState(10); // porcentaje (10)

  async function loadRounds(varianteId: string) {
    setRoundsLoading(true);
    try {
      const res = await fetch(`/api/cotizaciones?variante_id=${encodeURIComponent(varianteId)}&limit=50`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando rondas");
      const list = Array.isArray(json?.data) ? (json.data as Round[]) : [];
      setRounds(list);
    } catch {
      setRounds([]);
    } finally {
      setRoundsLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/cotizaciones/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando cotización");
      const d = json?.data as Detail;

      setData(d);

      setStatus(d.status || "enviada");
      setBuyPrice(String(d.buy_price ?? "0"));
      setSellPrice(String(d.sell_price ?? "0"));
      setNotes(d.notes || "");
      setPromote(false);

      // inicializar simulación con lo que tenga la cotización
      setSimCommission(Boolean(d.commission_enabled));
      const ratePct = Number(d.commission_rate ?? 0) * 100;
      setSimCommissionPct(Number.isFinite(ratePct) && ratePct > 0 ? ratePct : 10);

      if (d?.variante_id) await loadRounds(d.variante_id);
      else setRounds([]);
    } catch (e: any) {
      setMsg(e?.message || "Error");
      setData(null);
      setRounds([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buy = Math.max(0, toNumber(buyPrice, 0));
  const sell = Math.max(0, toNumber(sellPrice, 0));

  const gross = calcGrossMarginDecimal(buy, sell);

  // ✅ cálculo "real" según simulación (vista)
  const simRateDecimal = Math.max(0, toNumber(String(simCommissionPct), 0)) / 100;
  const net = calcNetProfitAndMargin_BSG(buy, sell, simCommission, simRateDecimal);

  // ✅ alerta usa neto si simulación ON, si no bruto
  const alertMargin = simCommission ? net.margin : gross;
  const isLowMargin = alertMargin < minMarginDecimal;

  async function guardar() {
    setMsg("");
    setSaving(true);
    try {
      const body: any = {
        status,
        buy_price: buy,
        sell_price: sell,
        notes,
      };

      // OJO: NO guardamos simCommission en BD (solo vista), por lo que no tocamos commission_enabled/commission_rate aquí.

      if (promote) {
        body.promote_to_master = true;
        body.valid_from = validFrom;
      }

      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando");

      setMsg(promote ? "✅ Guardado y promovido a master (si estaba aceptada)." : "✅ Guardado.");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function duplicar() {
    setMsg("");
    setDuplicating(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "enviada" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error duplicando");

      const newId = json?.cotizacion?.id;
      if (!newId) throw new Error("No se devolvió el id de la nueva cotización");

      router.push(`/desarrollo/cotizaciones/${newId}`);
    } catch (e: any) {
      setMsg(e?.message || "Error duplicando");
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-sm text-gray-600">Cargando…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cotización</h1>
          <Link href="/desarrollo/cotizaciones" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            ← Volver
          </Link>
        </div>
        <div className="text-red-700">{msg || "No encontrada"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧾 Cotización</h1>
        <div className="flex gap-2">
          <Link href="/desarrollo/cotizaciones" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            ← Volver
          </Link>

          <button
            onClick={duplicar}
            className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            disabled={duplicating}
          >
            {duplicating ? "Duplicando..." : "Duplicar (nueva ronda)"}
          </button>
        </div>
      </div>

      {isLowMargin && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="font-semibold text-red-800">⚠️ Margen por debajo del mínimo</div>
          <div className="text-sm text-red-800 mt-1">
            Margen usado para alerta: <b>{formatPctDecimal(alertMargin)}%</b> · Mínimo:{" "}
            <b>{Number(minMarginPct || 0).toFixed(2)}%</b>
          </div>
          <div className="text-xs text-red-700 mt-2">
            Neto (BSG): Beneficio = (Sell−Buy) + (Buy×comisión). Comisión siempre sobre BUY si está activa.
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl shadow border space-y-2">
        <div className="text-sm text-gray-600">
          <div><b>Customer:</b> {data.modelos?.customer || "-"}</div>
          <div><b>Style:</b> {data.modelos?.style || "-"}</div>
          <div><b>Season/Color:</b> {data.modelo_variantes?.season || "-"} · {data.modelo_variantes?.color || "-"}</div>
          <div><b>Creada:</b> {new Date(data.created_at).toLocaleString()} {data.created_by ? `· ${data.created_by}` : ""}</div>
          <div className="text-xs text-gray-500 mt-2">ID: {data.id}</div>
        </div>
      </div>

      {/* ✅ Simulación de comisión (solo vista) */}
      <div className="bg-white p-5 rounded-xl shadow border space-y-3">
        <div className="font-semibold">Simulación de comisión (solo vista)</div>
        <div className="text-sm text-gray-600">
          Actívala/desactívala cuando quieras para ver la “foto” real. No guarda nada.
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simCommission}
              onChange={(e) => setSimCommission(e.target.checked)}
            />
            Simular comisión
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm">%</span>
            <input
              value={String(simCommissionPct)}
              onChange={(e) => setSimCommissionPct(toNumber(e.target.value, 0))}
              className="border rounded px-3 py-2 w-24"
              disabled={!simCommission}
            />
            <span className="text-xs text-gray-500">
              (sobre BUY)
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border space-y-4">
        <div className="font-semibold">Editar cotización</div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="enviada">enviada</option>
              <option value="negociando">negociando</option>
              <option value="aceptada">aceptada</option>
              <option value="rechazada">rechazada</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Buy ($)</label>
            <input
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="text-sm">Sell ($)</label>
            <input
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
        </div>

        <div className="rounded border bg-gray-50 p-4 text-sm space-y-1">
          <div>Moneda: <b>{data.currency}</b></div>

          <div>
            Margen bruto: <b>{formatPctDecimal(gross)}%</b>
          </div>

          <div>
            Margen neto (BSG): <b>{formatPctDecimal(net.margin)}%</b>
            {!simCommission ? <span className="ml-2 text-xs text-gray-500">(simulación OFF)</span> : null}
            {isLowMargin ? <span className="ml-2 text-xs text-red-700">(bajo mín.)</span> : null}
          </div>

          <div>
            Beneficio neto: <b>${formatMoney(net.profit)}</b>{" "}
            {simCommission ? (
              <span className="text-xs text-gray-500">
                (incluye comisión ${formatMoney(net.commission)})
              </span>
            ) : (
              <span className="text-xs text-gray-500">(sin comisión)</span>
            )}
          </div>

          <div>
            Buy: <b>${formatMoney(buy)}</b> · Sell: <b>${formatMoney(sell)}</b>
          </div>
        </div>

        <div>
          <label className="text-sm">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded px-3 py-2 w-full min-h-[110px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={promote}
            onChange={(e) => setPromote(e.target.checked)}
          />
          <div className="text-sm text-gray-700">
            Promover a master (solo si status = <b>aceptada</b>)
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">valid_from</span>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={!promote}
            />
          </div>
        </div>

        <button
          onClick={guardar}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        {msg ? (
          <div className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-red-700"}`}>
            {msg}
          </div>
        ) : null}
      </div>

      {/* Histórico por variante */}
      <div className="bg-white p-5 rounded-xl shadow border space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Histórico de rondas (misma variante)</div>
          <div className="text-xs text-gray-500">
            {roundsLoading ? "Cargando..." : `${rounds.length} ronda(s)`}
          </div>
        </div>

        {rounds.length === 0 && !roundsLoading && (
          <div className="text-sm text-gray-600">No hay más cotizaciones para esta variante.</div>
        )}

        <div className="space-y-2">
          {rounds.map((r, idx) => {
            const isCurrent = r.id === id;

            const next = rounds[idx + 1];
            const deltaSell =
              next && Number.isFinite(Number(r.sell_price)) && Number.isFinite(Number(next.sell_price))
                ? Number(r.sell_price) - Number(next.sell_price)
                : null;

            const rg = calcGrossMarginDecimal(Number(r.buy_price), Number(r.sell_price));
            // en histórico usamos comisión guardada en esa ronda (no la simulación global)
            const rr = calcNetProfitAndMargin_BSG(
              Number(r.buy_price),
              Number(r.sell_price),
              Boolean(r.commission_enabled),
              Number(r.commission_rate ?? 0)
            );
            const rAlertMargin = r.commission_enabled ? rr.margin : rg;
            const low = rAlertMargin < minMarginDecimal;

            return (
              <div
                key={r.id}
                className={`rounded border p-3 text-sm ${
                  isCurrent ? "bg-blue-50 border-blue-300" : low ? "bg-red-50 border-red-200" : "bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {fmtDateTime(r.created_at)} ·{" "}
                    <span className="px-2 py-1 rounded bg-gray-100 border">{r.status}</span>
                    {isCurrent ? <span className="ml-2 text-xs text-blue-700">(actual)</span> : null}
                    {low ? <span className="ml-2 text-xs text-red-700">(bajo mín.)</span> : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-gray-700">
                      Buy <b>${formatMoney(Number(r.buy_price))}</b> · Sell{" "}
                      <b>${formatMoney(Number(r.sell_price))}</b> · Neto{" "}
                      <b>{formatPctDecimal(rr.margin)}%</b>
                    </div>
                    <Link
                      href={`/desarrollo/cotizaciones/${r.id}`}
                      className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                      title="Abrir esta ronda"
                    >
                      Abrir
                    </Link>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {r.created_by ? `Usuario: ${r.created_by}` : "Usuario: -"}
                  </div>

                  {deltaSell !== null ? (
                    <div className="text-xs text-gray-600">
                      Δ sell vs ronda anterior:{" "}
                      <b>{deltaSell >= 0 ? `+${formatMoney(deltaSell)}` : formatMoney(deltaSell)}</b>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Δ sell: —</div>
                  )}
                </div>

                {r.notes ? (
                  <div className="mt-2 text-gray-600 whitespace-pre-wrap">{r.notes}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}