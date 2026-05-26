"use client";

import { useState } from "react";

type SyncMode = "development" | "operational";

type MasterSyncResult = {
  ok?: boolean;
  mode?: string;
  models_created?: number;
  variants_upserted?: number;
  lineas_modelo_backfilled?: number;
  lineas_variante_backfilled?: number;
  prices_upserted?: number;
  snapshots_applied?: number;
  verification?: {
    total_lineas?: number;
    con_modelo?: number;
    con_variante?: number;
    con_snapshot?: number;
    sin_snapshot?: number;
  };
};

type ApiResponse = {
  ok: boolean;
  mode?: SyncMode;
  result?: MasterSyncResult;
  message?: string;
  error?: string;
};

export function MasterSyncPanel() {
  const [mode, setMode] = useState<SyncMode>("development");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  async function runSync() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/admin/master-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      const json = (await res.json()) as ApiResponse;
      setResponse(json);
    } catch {
      setResponse({
        ok: false,
        message: "No se pudo ejecutar Master Sync",
      });
    } finally {
      setLoading(false);
    }
  }

  const result = response?.result;
  const verification = result?.verification;

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Regla operativa</p>
        <p className="mt-1">
          Ejecutar solo después de importaciones de España. Las importaciones de
          China solo actualizan fechas y no deben tocar Master, variantes,
          precios ni snapshots.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Modo
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as SyncMode)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="development">
              Development / Import masivo · latest by season
            </option>
            <option value="operational">
              Operational · valid_from by PO date
            </option>
          </select>
        </label>

        <button
          type="button"
          onClick={runSync}
          disabled={loading}
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ejecutando..." : "Ejecutar Master Sync"}
        </button>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h2 className="text-base font-semibold">Qué hace esta operación</h2>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <InfoItem label="1" text="Crea modelos faltantes desde lineas_pedido.style" />
          <InfoItem label="2" text="Crea o actualiza variantes por modelo + season + color + reference" />
          <InfoItem label="3" text="Backfill de modelo_id y variante_id en líneas pendientes" />
          <InfoItem label="4" text="Sincroniza precios master sin duplicar variante + valid_from" />
          <InfoItem label="5" text="Aplica snapshot solo si master_price_id_used está vacío" />
          <InfoItem label="6" text="Devuelve verificación final de cobertura Master" />
        </div>
      </div>

      {response && (
        <div
          className={`rounded-xl border p-4 ${
            response.ok
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`font-semibold ${
              response.ok ? "text-emerald-900" : "text-red-900"
            }`}
          >
            {response.ok ? "Master Sync ejecutado correctamente" : "Error"}
          </p>

          {!response.ok && (
            <p className="mt-1 text-sm text-red-800">
              {response.error ?? response.message ?? "Error desconocido"}
            </p>
          )}

          {response.ok && result && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ResultCard label="Modelos creados" value={result.models_created} />
              <ResultCard label="Variantes upsert" value={result.variants_upserted} />
              <ResultCard label="Precios upsert" value={result.prices_upserted} />
              <ResultCard
                label="Líneas modelo backfill"
                value={result.lineas_modelo_backfilled}
              />
              <ResultCard
                label="Líneas variante backfill"
                value={result.lineas_variante_backfilled}
              />
              <ResultCard
                label="Snapshots aplicados"
                value={result.snapshots_applied}
              />
            </div>
          )}

          {response.ok && verification && (
            <div className="mt-4 rounded-lg border bg-white/70 p-4">
              <p className="text-sm font-semibold">Verificación final</p>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <ResultCard label="Total líneas" value={verification.total_lineas} />
                <ResultCard label="Con modelo" value={verification.con_modelo} />
                <ResultCard label="Con variante" value={verification.con_variante} />
                <ResultCard label="Con snapshot" value={verification.con_snapshot} />
                <ResultCard label="Sin snapshot" value={verification.sin_snapshot} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InfoItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
        {label}
      </div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function ResultCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="rounded-lg border bg-white/80 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">
        {(value ?? 0).toLocaleString("es-ES")}
      </p>
    </div>
  );
}