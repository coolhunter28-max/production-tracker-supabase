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

type Detail = {
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

export default function CotizacionDetailPage({
  params,
}: {
  params: { cotizacionId: string };
}) {
  const router = useRouter();
  const id = params.cotizacionId;

  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);

  // mensajes
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
    } catch (e: any) {
      setMsg(e?.message || "Error");
      setData(null);
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
  const marginPct = buy > 0 ? (sell - buy) / buy : 0;

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
        // ✅ notas vacías por defecto. status "enviada" por defecto.
        body: JSON.stringify({ status: "enviada" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error duplicando");

      const newId = json?.cotizacion?.id;
      if (!newId) throw new Error("No se devolvió el id de la nueva cotización");

      // Ir directo a la nueva cotización
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
          <Link
            href="/desarrollo/cotizaciones"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
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
          <Link
            href="/desarrollo/cotizaciones"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            ← Volver
          </Link>

          <button
            onClick={duplicar}
            className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            disabled={duplicating}
            title="Crea una nueva cotización (misma variante y precios) con notas vacías"
          >
            {duplicating ? "Duplicando..." : "Duplicar (nueva ronda)"}
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border space-y-2">
        <div className="text-sm text-gray-600">
          <div>
            <b>Customer:</b> {data.modelos?.customer || "-"}
          </div>
          <div>
            <b>Style:</b> {data.modelos?.style || "-"}
          </div>
          <div>
            <b>Season/Color:</b> {data.modelo_variantes?.season || "-"} ·{" "}
            {data.modelo_variantes?.color || "-"}
          </div>
          <div>
            <b>Creada:</b> {new Date(data.created_at).toLocaleString()}{" "}
            {data.created_by ? `· ${data.created_by}` : ""}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            ID: {data.id}
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
          <div>
            Moneda: <b>{data.currency}</b>
          </div>
          <div>
            Margen (sobre coste): <b>{formatPctDecimal(marginPct)}%</b>
          </div>
          <div>
            Buy: <b>${formatMoney(buy)}</b> · Sell:{" "}
            <b>${formatMoney(sell)}</b>
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
          <div
            className={`text-sm ${
              msg.startsWith("✅") ? "text-green-700" : "text-red-700"
            }`}
          >
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}