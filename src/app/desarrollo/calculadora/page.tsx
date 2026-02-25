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

export default function CalculadoraPage() {
  const [operativa, setOperativa] = React.useState<"BSG" | "XIAMEN">("BSG");

  const [buyPrice, setBuyPrice] = React.useState("0");
  const [qty, setQty] = React.useState("1");

  const [commissionEnabled, setCommissionEnabled] = React.useState(false);
  const [commissionRate, setCommissionRate] = React.useState("10");

  const [mode, setMode] = React.useState<"M2P" | "P2M">("M2P");

  const [targetMarginPct, setTargetMarginPct] = React.useState("20");
  const [sellPrice, setSellPrice] = React.useState("0");

  const roundingStep = 0.05;

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

  // Cálculo desde margen objetivo (sobre coste)
  const targetPct = Math.max(0, toNumber(targetMarginPct, 0)) / 100;

  const commissionPerUnit = commissionEnabled ? cost * rate : 0;
  const rawSell = cost * (1 + targetPct) - commissionPerUnit;
  const suggestedSell = roundToStep(Math.max(0, rawSell), roundingStep);

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧮 Calculadora BSG</h1>
        <Link href="/desarrollo" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
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
                <label className="text-sm">Buy price (coste unitario)</label>
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
                  <div className="text-sm">Selling price sugerido (redondeado 0.05)</div>
                  <div className="text-xl font-bold">{formatMoney(suggestedSell)}</div>
                </div>
              </>
            )}

            {mode === "P2M" && (
              <>
                <div>
                  <label className="text-sm">Price selling</label>
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
          </div>
        </>
      )}
    </div>
  );
}