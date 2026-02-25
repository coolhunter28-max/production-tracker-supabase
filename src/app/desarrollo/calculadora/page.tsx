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

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CalculadoraPage() {
  const [operativa, setOperativa] = React.useState<"BSG" | "XIAMEN">("BSG");

  const [buyPrice, setBuyPrice] = React.useState("0");
  const [qty, setQty] = React.useState("1");

  const [commissionEnabled, setCommissionEnabled] = React.useState(false);
  const [commissionRate, setCommissionRate] = React.useState("10");

  const [mode, setMode] = React.useState<"M2P" | "P2M">("M2P");

  const [targetMarginPct, setTargetMarginPct] = React.useState("20");
  const [sellPrice, setSellPrice] = React.useState("0");

  // ✅ Redondeo fijo 0.05
  const roundingStep = 0.05;

  // Cálculos base
  const cost = Math.max(0, toNumber(buyPrice, 0));
  const q = Math.max(1, Math.floor(toNumber(qty, 1)));
  const rate = Math.max(0, toNumber(commissionRate, 10)) / 100;

  const buyAmount = cost * q;
  const commission = commissionEnabled ? buyAmount * rate : 0;

  const sell = Math.max(0, toNumber(sellPrice, 0));
  const sellAmount = sell * q;

  const marginBase = sellAmount - buyAmount;
  const marginTotal = marginBase + commission;
  const marginPctB = buyAmount > 0 ? marginTotal / buyAmount : 0;

  // Margen -> precio (margen % sobre coste)
  const targetPct = Math.max(0, toNumber(targetMarginPct, 0)) / 100;
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

  async function buscarModelos() {
    setSaveStatus("idle");
    setSaveMessage("");
    setModelosLoading(true);

    // Reset selección
    setSelectedModeloId("");
    setSelectedVarianteId("");
    setVariantes([]);

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
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      // ✅ OJO: este endpoint debe existir: GET /api/variantes?modelo_id=...
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

  async function guardarPrecio() {
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

      // ✅ Endpoint existente:
      // POST /api/variantes/[varianteId]/precios
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
            En Xiamen China marca el precio. Aquí actuamos como comerciales a
            comisión.
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
                  <div className="text-sm">
                    Selling price sugerido (redondeado 0.05) — $
                  </div>
                  <div className="text-xl font-bold">
                    {formatMoney(suggestedSell)}
                  </div>
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

          {/* Guardar */}
          <div className="bg-white p-5 rounded-xl shadow border space-y-4">
            <div className="font-semibold">
              Confirmar y guardar en master (modelo_precios)
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
                <div className="text-xs text-gray-500 mt-1">
                  {modelos.length === 0
                    ? "Haz una búsqueda para ver modelos."
                    : `${modelos.length} resultado(s).`}
                </div>
              </div>

              <div>
                <label className="text-sm">Variante (season · color)</label>
                <select
                  value={selectedVarianteId}
                  onChange={(e) => setSelectedVarianteId(e.target.value)}
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
                <div className="text-xs text-gray-500 mt-1">
                  {variantesLoading
                    ? "Cargando variantes..."
                    : selectedModeloId
                    ? `${variantes.length} variante(s).`
                    : ""}
                </div>
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
                Selling price a guardar: <b>{formatMoney(sellToSave)}</b>{" "}
                (redondeado 0.05)
              </div>
            </div>

            <button
              onClick={guardarPrecio}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving"
                ? "Guardando..."
                : "Guardar precio en master"}
            </button>

            {saveStatus !== "idle" && (
              <div
                className={`text-sm ${
                  saveStatus === "ok"
                    ? "text-green-700"
                    : saveStatus === "error"
                    ? "text-red-700"
                    : "text-gray-700"
                }`}
              >
                {saveMessage}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}