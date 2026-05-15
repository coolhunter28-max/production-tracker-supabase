import Link from "next/link";
import type { ExecutiveIntelligenceSignal } from "@/lib/analytics/executive-intelligence";

type Props = {
  rows: ExecutiveIntelligenceSignal[];
  queryString?: string;
};

function formatPct(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

function getAlertClasses(level: string) {
  if (level === "CRITICAL") return "border-red-200 bg-red-50 text-red-800";
  if (level === "WARNING") return "border-amber-200 bg-amber-50 text-amber-800";
  if (level === "MONITOR") return "border-blue-200 bg-blue-50 text-blue-800";
  if (level === "HEALTHY") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function ExecutiveIntelligenceBoard({ rows, queryString }: Props) {
  const visibleRows = rows.slice(0, 6);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Executive Intelligence
        </p>
        <h2 className="text-xl font-semibold text-slate-950">
          Qué está pasando
        </h2>
        <p className="text-sm text-slate-500">
          Señales priorizadas desde BI Layer. Una señal principal por cliente.
        </p>
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          No hay señales ejecutivas para el contexto actual.
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleRows.map((row) => {
            const detailHref = `/analytics/clientes/${encodeURIComponent(
              row.customer
            )}${queryString ? `?${queryString}` : ""}`;

            return (
              <article
                key={`${row.customer}-${row.alert_type}`}
                className="rounded-xl border p-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getAlertClasses(
                          row.alert_level
                        )}`}
                      >
                        {row.alert_level}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {row.source_module}
                      </span>
                      {row.score_model ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {row.score_model}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-base font-semibold text-slate-950">
                      {row.customer}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {row.alert_reason || row.health_reason || "Sin explicación disponible."}
                    </p>

                    {row.recommended_action ? (
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        Acción: {row.recommended_action}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-right text-xs md:min-w-48">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Score</p>
                      <p className="font-semibold text-slate-950">
                        {row.contextual_business_score ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Friction</p>
                      <p className="font-semibold text-slate-950">
                        {row.customer_friction_score ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Qty growth</p>
                      <p className="font-semibold text-slate-950">
                        {formatPct(row.qty_growth_pct)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Sell growth</p>
                      <p className="font-semibold text-slate-950">
                        {formatPct(row.sell_growth_pct)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <Link
                    href={detailHref}
                    className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    Ver cliente
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}