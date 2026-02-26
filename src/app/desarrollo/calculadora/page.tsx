"use client";

import * as React from "react";
import Link from "next/link";

function toNumber(value: string, fallback = 0) {
  const v = Number(String(value).replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0;
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return (value * 100).toFixed(2);
}

type Modelo = {
  id: string;
  style: string;
  reference?: string | null;
  customer?: string | null;
  supplier?: string | null;
  factory?: string | null;
  status?: string | null;
};

type Variante = {
  id: string;
  modelo_id: string;
  season: string;
  color: string;
  factory?: string | null;
  status?: string | null;
};

type Cotizacion = {
  id: string;
  modelo_id: string | null;
  variante_id: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  margin_pct: number | null; // decimal
  commission_enabled: boolean;
  commission_rate: number | null; // decimal
  rounding_step: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CalculadoraPage() {
  const [operativa, setOperativa] = React.useState<"BSG" | "XIAMEN">("BSG");

  const [buyPrice, setBuyPrice] = React.useState("0");
  const [qty, setQty] = React.useState("1");

  const [commissionEnabled, setCommissionEnabled] = React.useState(false);
  const [commissionRate, setCommissionRate] = React.useState("10"); // %

  const [mode, setMode] = React.useState<"M2P" | "P2M">("M2P");

  const [targetMarginPct, setTargetMarginPct] = React.useState("20"); // %
  const [sellPrice, setSellPrice] = React.useState("0");

  // ✅ Redondeo fijo 0.05
  const roundingStep = 0.05;

  // Cálculos base
  const cost = Math.max(0, toNumber(buyPrice, 0));
  const q = Math.max(1, Math.floor(toNumber(qty, 1)));
  const rate = Math.max(0, toNumber(commissionRate, 10)) / 100; // decimal

  const buyAmount = cost * q;
  const commission = commissionEnabled ? buyAmount * rate : 0;

  const sell = Math.max(0, toNumber(sellPrice, 0));
  const sellAmount = sell * q;

  const marginBase = sellAmount - buyAmount;
  const marginTotal = marginBase + commission;
  const marginPctB = buyAmount > 0 ? marginTotal / buyAmount : 0; // decimal

  // Margen -> precio (margen % sobre coste)
  const targetPct = Math.max(0, toNumber(targetMarginPct, 0)) / 100; // decimal
  const commissionPerUnit = commissionEnabled ? cost * rate : 0;
  const rawSell = cost * (1 + targetPct) - commissionPerUnit;
  const suggestedSell = roundToStep(Math.max(0, rawSell), roundingStep);

  // ✅ Precio final que guardaremos (según modo)
  const sellToSave =
    mode === "M2P"
      ? suggestedSell
      : roundToStep(Math.max(0, sell), roundingStep);

  // ===== Guardado en master (modelo_precios) via endpoint existente =====
  const [userName, setUserName] = React.useState("antonio");
  const [validFrom, setValidFrom] = React.useState(todayYYYYMMDD());
  const currency = "USD"; // ✅ por defecto $

  const [modeloQuery, setModeloQuery] = React.useState("");
  const [modelos, setModelos] = React.useState<Modelo[]>([]);
  const [modelosLoading, setModelosLoading] = React.useState(false);

  const [selectedModeloId, setSelectedModeloId] = React.useState<string>("");
  const [variantes, setVariantes] = React.useState<Variante[]>([]);
  const [variantesLoading, setVariantesLoading] = React.useState(false);
  const [selectedVarianteId, setSelectedVarianteId] = React.useState<string>("");

  const [saveStatus, setSaveStatus] = React.useState<
    "idle" | "saving" | "ok" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = React.useState<string>("");

  // ===== Cotizaciones =====
  const [quoteStatus, setQuoteStatus] = React.useState("enviada");
  const [quoteNotes, setQuoteNotes] = React.useState("");
  const [quotes, setQuotes] = React.useState<Cotizacion[]>([]);
  const [quotesLoading, setQuotesLoading] = React.useState(false);
  const [quoteSaveStatus, setQuoteSaveStatus] = React.useState<
    "idle" | "saving" | "ok" | "error"
  >("idle");
  const [quoteSaveMessage, setQuoteSaveMessage] = React.useState("");

  async function buscarModelos() {
    setSaveStatus("idle");
    setSaveMessage("");
    setModelosLoading(true);

    // Reset selección
    setSelectedModeloId("");
    setSelectedVarianteId("");
    setVariantes([]);
    setQuotes([]);

    try {
      const q = modeloQuery.trim();
      const res = await fetch(
        `/api/modelos?q=${encodeURIComponent(q)}&limit=20&offset=0`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error buscando modelos");
      setModelos(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setModelos([]);
      setSaveStatus("error");
      setSaveMessage(e?.message || "Error buscando modelos");
    } finally {
      setModelosLoading(false);
    }
  }

  async function cargarVariantes(modeloId: string) {
    setVariantesLoading(true);
    setSelectedVarianteId("");
    setVariantes([]);
    setQuotes([]);
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      // ✅ Endpoint: GET /api/variantes?modelo_id=...
      const res = await fetch(
        `/api/variantes?modelo_id=${encodeURIComponent(modeloId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando variantes");
      setVariantes(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setVariantes([]);
      setSaveStatus("error");
      setSaveMessage(
        e?.message ||
          "Error cargando variantes (¿existe /api/variantes?modelo_id=...?)"
      );
    } finally {
      setVariantesLoading(false);
    }
  }

  async function cargarCotizaciones(varianteId: string) {
    setQuotesLoading(true);
    setQuoteSaveStatus("idle");
    setQuoteSaveMessage("");
    try {
      const res = await fetch(
        `/api/cotizaciones?variante_id=${encodeURIComponent(varianteId)}&limit=30`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando cotizaciones");
      setQuotes(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setQuotes([]);
      setQuoteSaveStatus("error");
      setQuoteSaveMessage(e?.message || "Error cargando cotizaciones");
    } finally {
      setQuotesLoading(false);
    }
  }

  async function guardarPrecioMaster() {
    setSaveStatus("idle");
    setSaveMessage("");

    if (!selectedVarianteId) {
      setSaveStatus("error");
      setSaveMessage("Selecciona una variante antes de guardar.");
      return;
    }
    if (!validFrom) {
      setSaveStatus("error");
      setSaveMessage("Selecciona una fecha (valid_from).");
      return;
    }

    setSaveStatus("saving");
    try {
      const body = {
        buy_price: cost,
        sell_price: sellToSave,
        currency, // "USD"
        valid_from: validFrom, // YYYY-MM-DD
        created_by: (userName || "").trim() || "antonio",
      };

      const res = await fetch(`/api/variantes/${selectedVarianteId}/precios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando precio");

      setSaveStatus("ok");
      setSaveMessage(
        "✅ Precio guardado en master (modelo_precios). Si existía el mismo día, se actualizó."
      );
    } catch (e: any) {
      setSaveStatus("error");
      setSaveMessage(e?.message || "Error guardando precio");
    }
  }

  async function guardarCotizacion() {
    setQuoteSaveStatus("idle");
    setQuoteSaveMessage("");

    if (!selectedVarianteId) {
      setQuoteSaveStatus("error");
      setQuoteSaveMessage("Selecciona una variante antes de guardar la cotización.");
      return;
    }

    setQuoteSaveStatus("saving");
    try {
      const body = {
        variante_id: selectedVarianteId,
        modelo_id: selectedModeloId || null,
        currency: "USD",
        buy_price: cost,
        sell_price: sellToSave,

        // trazabilidad de cómo se calculó
        margin_pct: mode === "M2P" ? targetPct : marginPctB, // decimal
        commission_enabled: commissionEnabled,
        commission_rate: commissionEnabled ? rate : null, // decimal
        rounding_step: roundingStep,

        status: quoteStatus,
        notes: quoteNotes || null,
        created_by: (userName || "").trim() || "antonio",
      };

      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error guardando cotización");

      setQuoteSaveStatus("ok");
      setQuoteSaveMessage("✅ Cotización guardada.");
      setQuoteNotes("");

      await cargarCotizaciones(selectedVarianteId);
    } catch (e: any) {
      setQuoteSaveStatus("error");
      setQuoteSaveMessage(e?.message || "Error guardando cotización");
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧮 Calculadora BSG</h1>
        <Link
          href="/desarrollo"
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          ← Volver
        </Link>
      </div>

      {/* Operativa */}
      <div className="bg-white p-5 rounded-xl shadow border space-y-4">
        <div className="font-semibold">Operativa</div>

        <select
          value={operativa}
          onChange={(e) => setOperativa(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="BSG">BSG</option>
          <option value="XIAMEN">Xiamen</option>
        </select>

        {operativa === "XIAMEN" && (
          <div className="text-sm text-gray-600">
            En Xiamen China marca el precio. Aquí actuamos como comerciales a comisión.
          </div>
        )}
      </div>

      {operativa === "BSG" && (
        <>
          {/* Inputs */}
          <div className="bg-white p-5 rounded-xl shadow border space-y-4">
            <div className="font-semibold">Inputs</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Buy price (coste unitario) — $</label>
                <input
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-sm">Qty</label>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={commissionEnabled}
                onChange={(e) => setCommissionEnabled(e.target.checked)}
              />
              <span className="text-sm">Activar comisión</span>

              <input
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="border rounded px-3 py-2 w-20"
                disabled={!commissionEnabled}
              />
              <span className="text-sm">% (default 10)</span>
            </div>
          </div>

          {/* Modo */}
          <div className="bg-white p-5 rounded-xl shadow border space-y-4">
            <div className="font-semibold">Modo de cálculo</div>

            <div className="flex gap-4">
              <button
                onClick={() => setMode("M2P")}
                className={`px-4 py-2 rounded ${
                  mode === "M2P" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Margen → Precio
              </button>

              <button
                onClick={() => setMode("P2M")}
                className={`px-4 py-2 rounded ${
                  mode === "P2M" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Precio → Margen
              </button>
            </div>

            {mode === "M2P" && (
              <>
                <div>
                  <label className="text-sm">Margen objetivo % (sobre coste)</label>
                  <input
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded border">
                  <div className="text-sm">Selling price sugerido (redondeado 0.05) — $</div>
                  <div className="text-xl font-bold">{formatMoney(suggestedSell)}</div>
                </div>
              </>
            )}

            {mode === "P2M" && (
              <>
                <div>
                  <label className="text-sm">Price selling (venta unitaria) — $</label>
                  <input
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded border space-y-2 text-sm">
                  <div>Sell amount: {formatMoney(sellAmount)}</div>
                  <div>Buy amount: {formatMoney(buyAmount)}</div>
                  <div>Comisión: {formatMoney(commission)}</div>
                  <div>Margen total: {formatMoney(marginTotal)}</div>
                  <div className="font-semibold">
                    Margen % (sobre coste): {formatPct(marginPctB)}%
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-gray-600">
              Guardado: el selling que se guardará será{" "}
              <b>{formatMoney(sellToSave)}</b> ($) (redondeado 0.05).
            </div>
          </div>

          {/* Guardar master */}
          <div className="bg-white p-5 rounded-xl shadow border space-y-4">
            <div className="font-semibold">Confirmar y guardar en master (modelo_precios)</div>
            <div className="text-sm text-gray-600">
              Guarda en master por variante y fecha (1 por día). No afecta a pedidos existentes.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Usuario (registro)</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="antonio"
                />
              </div>

              <div>
                <label className="text-sm">Fecha (valid_from)</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-2">
                <label className="text-sm">Buscar modelo (style / reference)</label>
                <input
                  value={modeloQuery}
                  onChange={(e) => setModeloQuery(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Ej: SNEAK-001"
                />
              </div>
              <button
                onClick={buscarModelos}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                disabled={modelosLoading}
              >
                {modelosLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Modelo</label>
                <select
                  value={selectedModeloId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedModeloId(id);
                    if (id) cargarVariantes(id);
                  }}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">-- Selecciona modelo --</option>
                  {modelos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.style}
                      {m.customer ? ` · ${m.customer}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm">Variante (season · color)</label>
                <select
                  value={selectedVarianteId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setSelectedVarianteId(vId);
                    if (vId) cargarCotizaciones(vId);
                    else setQuotes([]);
                  }}
                  className="border rounded px-3 py-2 w-full"
                  disabled={!selectedModeloId || variantesLoading}
                >
                  <option value="">
                    {!selectedModeloId
                      ? "-- Selecciona modelo primero --"
                      : "-- Selecciona variante --"}
                  </option>
                  {variantes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.season} · {v.color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded border bg-gray-50 p-4 text-sm space-y-1">
              <div>
                Moneda: <b>$ ({currency})</b>
              </div>
              <div>
                Buy price a guardar: <b>{formatMoney(cost)}</b>
              </div>
              <div>
                Selling price a guardar: <b>{formatMoney(sellToSave)}</b> (redondeado 0.05)
              </div>
            </div>

            <button
              onClick={guardarPrecioMaster}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Guardando..." : "Guardar precio en master"}
            </button>

            {saveStatus !== "idle" && (
              <div className={`text-sm ${saveStatus === "ok" ? "text-green-700" : "text-red-700"}`}>
                {saveMessage}
              </div>
            )}
          </div>

          {/* Cotizaciones */}
          <div className="bg-white p-5 rounded-xl shadow border space-y-4">
            <div className="font-semibold">Cotizaciones (histórico comercial)</div>
            <div className="text-sm text-gray-600">
              Guarda cada propuesta enviada al cliente (regateos incluidos). Separado del master.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Estado</label>
                <select
                  value={quoteStatus}
                  onChange={(e) => setQuoteStatus(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="enviada">enviada</option>
                  <option value="negociando">negociando</option>
                  <option value="aceptada">aceptada</option>
                  <option value="rechazada">rechazada</option>
                </select>
              </div>

              <div className="rounded border bg-gray-50 p-3 text-sm space-y-1">
                <div>Se guardará:</div>
                <div>
                  Buy: <b>{formatMoney(cost)}</b> — Sell: <b>{formatMoney(sellToSave)}</b> ($)
                </div>
                <div>
                  Margen (sobre coste):{" "}
                  <b>{formatPct(mode === "M2P" ? targetPct : marginPctB)}%</b>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm">Notas (opcional)</label>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                className="border rounded px-3 py-2 w-full min-h-[90px]"
                placeholder="Ej: Cliente pide bajar 0.50$, cambio material..."
              />
            </div>

            <button
              onClick={guardarCotizacion}
              className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60"
              disabled={quoteSaveStatus === "saving"}
            >
              {quoteSaveStatus === "saving" ? "Guardando..." : "Guardar como cotización"}
            </button>

            {quoteSaveStatus !== "idle" && (
              <div className={`text-sm ${quoteSaveStatus === "ok" ? "text-green-700" : "text-red-700"}`}>
                {quoteSaveMessage}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">Últimas cotizaciones</div>
                <div className="text-xs text-gray-500">
                  {selectedVarianteId
                    ? quotesLoading
                      ? "Cargando..."
                      : `${quotes.length} registro(s)`
                    : "Selecciona una variante"}
                </div>
              </div>

              {!selectedVarianteId && (
                <div className="text-sm text-gray-600">
                  Selecciona una variante para ver su histórico.
                </div>
              )}

              {selectedVarianteId && !quotesLoading && quotes.length === 0 && (
                <div className="text-sm text-gray-600">
                  Aún no hay cotizaciones para esta variante.
                </div>
              )}

              {quotes.map((q) => (
                <div key={q.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">
                      {q.status.toUpperCase()} · ${formatMoney(Number(q.sell_price))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(q.created_at)} {q.created_by ? `· ${q.created_by}` : ""}
                    </div>
                  </div>
                  <div className="text-gray-700 mt-1">
                    Buy ${formatMoney(Number(q.buy_price))} · Sell ${formatMoney(Number(q.sell_price))} · Margen{" "}
                    {q.margin_pct !== null ? `${formatPct(Number(q.margin_pct))}%` : "—"}
                  </div>
                  {q.notes ? (
                    <div className="text-gray-600 mt-1 whitespace-pre-wrap">{q.notes}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}