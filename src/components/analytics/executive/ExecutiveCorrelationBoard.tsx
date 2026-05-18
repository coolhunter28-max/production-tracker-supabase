import Link from "next/link";
import type { ExecutiveCorrelationSignal } from "@/lib/analytics/executive-correlations";

function SeverityBadge({ severity }: { severity: string }) {
  const className =
    severity === "CRITICAL"
      ? "bg-red-100 text-red-700 ring-red-200"
      : severity === "WARNING"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-blue-100 text-blue-700 ring-blue-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {severity}
    </span>
  );
}

function CorrelationTypeBadge({
  type,
}: {
  type: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {type.replaceAll("_", " ")}
    </span>
  );
}

export function ExecutiveCorrelationBoard({
  rows,
}: {
  rows: ExecutiveCorrelationSignal[];
}) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Correlation Intelligence
        </p>

        <h2 className="text-2xl font-semibold tracking-tight">
          Executive Correlations
        </h2>

        <p className="text-sm text-muted-foreground">
          Relaciones detectadas automáticamente entre módulos de negocio.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {rows.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No hay correlaciones detectadas.
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.customer}-${row.correlation_type}-${index}`}
              className="rounded-2xl border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={row.severity} />

                    <CorrelationTypeBadge
                      type={row.correlation_type}
                    />

                    <span className="text-xs text-muted-foreground">
                      Score {row.correlation_score}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">
                      {row.customer}
                    </h3>

                    <p className="mt-1 text-sm">
                      {row.correlation_reason}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/analytics/clientes/${encodeURIComponent(
                      row.customer
                    )}`}
                    className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Ver cliente
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}