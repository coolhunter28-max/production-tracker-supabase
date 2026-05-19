import Link from "next/link";
import type { ExecutiveActionQueueRow } from "@/lib/analytics/executive-actions";

type Props = {
  actions: ExecutiveActionQueueRow[];
};

function priorityClass(priority: string) {
  if (priority === "CRITICAL") {
    return "border-red-300 bg-red-50 text-red-700";
  }

  if (priority === "HIGH") {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  if (priority === "MEDIUM") {
    return "border-yellow-300 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-700";
}

function statusClass(status: string) {
  if (status === "OPEN") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "IN_PROGRESS") {
    return "bg-purple-50 text-purple-700";
  }

  if (status === "WAITING") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "RESOLVED") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-600";
}

export function ExecutiveActionQueue({ actions }: Props) {
  const visibleActions = actions.slice(0, 6);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Executive Action Queue
          </h2>
          <p className="text-sm text-slate-500">
            Workflows generados desde señales BI críticas y warning.
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {actions.length} abiertas
        </div>
      </div>

      {visibleActions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          No hay acciones ejecutivas abiertas.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleActions.map((action) => (
            <article
              key={action.id}
              className={`rounded-xl border p-4 ${priorityClass(
                action.priority
              )}`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
                      {action.priority}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        action.status
                      )}`}
                    >
                      {action.status}
                    </span>

                    {action.customer ? (
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium">
                        {action.customer}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-950">
                    {action.title}
                  </h3>

                  {action.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                      {action.description}
                    </p>
                  ) : null}

                  {action.recommended_action ? (
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      Acción recomendada: {action.recommended_action}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col gap-2 text-xs text-slate-600 lg:text-right">
                  <span>
                    Owner:{" "}
                    <strong className="text-slate-900">
                      {action.owner_label || "Sin asignar"}
                    </strong>
                  </span>

                  <span>
                    Notas: <strong>{action.notes_count}</strong>
                  </span>

                  <Link
                    href={`/analytics/executive/actions/${action.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Gestionar acción
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}