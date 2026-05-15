import Link from "next/link";
import type { ExecutiveNarrativeRow } from "@/lib/analytics/executive-narrative";

type Props = {
  rows: ExecutiveNarrativeRow[];
  queryString?: string;
};

function getLevelClass(level: string) {
  if (level === "CRITICAL") return "bg-red-50 text-red-800 ring-red-200";
  if (level === "WARNING") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (level === "HEALTHY") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function ExecutiveNarrativePanel({ rows, queryString }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Executive Narrative
        </p>
        <h2 className="text-xl font-semibold text-slate-950">
          Qué está pasando
        </h2>
        <p className="text-sm text-slate-500">
          Lectura ejecutiva generada desde BI Layer para el contexto actual.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const href = row.customer
            ? `/analytics/clientes/${encodeURIComponent(row.customer)}${
                queryString ? `?${queryString}` : ""
              }`
            : null;

          return (
            <article
              key={`${row.narrative_order}-${row.narrative_code}`}
              className="rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getLevelClass(
                        row.narrative_level
                      )}`}
                    >
                      {row.narrative_level}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {row.narrative_code.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-950">
                    {row.narrative_text}
                  </p>

                  {row.recommended_action ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Acción: {row.recommended_action}
                    </p>
                  ) : null}
                </div>

                {href ? (
                  <Link
                    href={href}
                    className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    Ver cliente
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}