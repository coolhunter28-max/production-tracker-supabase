import Link from "next/link";
import type { ExecutiveNarrativeRow } from "@/lib/analytics/executive-narrative";

type Props = {
  rows: ExecutiveNarrativeRow[];
  queryString?: string;
};

function severityClass(severity: ExecutiveNarrativeRow["severity"]) {
  if (severity === "CRITICAL") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "WARNING") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (severity === "HEALTHY") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatValue(value: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return value;
}

export function ExecutiveNarrativePanel({ rows }: Props) {
  const orderedRows = [...rows].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Executive Narrative
        </p>
        <h2 className="text-lg font-semibold">
          Daily Executive Brief
        </h2>
        <p className="text-sm text-muted-foreground">
          Resumen ejecutivo generado desde BI y workflow lifecycle.
        </p>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {orderedRows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground lg:col-span-3">
            No hay narrativa ejecutiva disponible.
          </div>
        ) : (
          orderedRows.map((row) => (
            <article
              key={row.id}
              className={`rounded-xl border p-4 ${severityClass(
                row.severity
              )}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {row.section}
                </span>

                <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
                  {row.severity}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-950">
                {row.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {row.summary}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-slate-500">{row.primary_label}</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatValue(row.primary_value)}
                  </p>
                </div>

                {row.secondary_label ? (
                  <div className="rounded-lg bg-white/70 p-2">
                    <p className="text-slate-500">
                      {row.secondary_label}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatValue(row.secondary_value)}
                    </p>
                  </div>
                ) : null}
              </div>

              {row.href && row.action_label ? (
                <Link
                  href={row.href}
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  {row.action_label}
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}