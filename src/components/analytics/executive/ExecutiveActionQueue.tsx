import Link from "next/link";
import type { ExecutiveActionQueueRow } from "@/lib/analytics/executive-actions";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

type Props = {
  actions: ExecutiveActionQueueRow[];
};

function priorityClass(priority: string) {
  if (priority === "CRITICAL") return "bg-red-100 text-red-700";
  if (priority === "HIGH") return "bg-orange-100 text-orange-700";
  if (priority === "MEDIUM") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-700";
}

function statusClass(status: string) {
  if (status === "OPEN") return "bg-blue-100 text-blue-700";
  if (status === "IN_PROGRESS") return "bg-purple-100 text-purple-700";
  if (status === "WAITING") return "bg-amber-100 text-amber-700";
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

export function ExecutiveActionQueue({ actions }: Props) {
  const visibleActions = actions.slice(0, 10);

  return (
    <section
      id="executive-action-queue"
      className="rounded-2xl border bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Executive Action Queue
          </h2>
          <p className="text-xs text-slate-500">
            Acciones ejecutivas generadas desde señales BI.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {actions.length} abiertas
        </span>
      </div>

      {visibleActions.length === 0 ? (
        <div className="p-5">
          <AnalyticsEmptyState
            title="Sin acciones ejecutivas"
            description="No hay acciones abiertas para revisar en este momento."
          />
        </div>
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 shadow-sm">
              <tr>
                <th className="bg-slate-50 px-4 py-2 font-medium">Priority</th>
                <th className="bg-slate-50 px-4 py-2 font-medium">Status</th>
                <th className="bg-slate-50 px-4 py-2 font-medium">Customer</th>
                <th className="bg-slate-50 px-4 py-2 font-medium">Action</th>
                <th className="bg-slate-50 px-4 py-2 font-medium">Owner</th>
                <th className="bg-slate-50 px-4 py-2 text-right font-medium">
                  Notes
                </th>
                <th className="bg-slate-50 px-4 py-2 text-right font-medium" />
              </tr>
            </thead>

            <tbody>
              {visibleActions.map((action) => (
                <tr key={action.id} className="border-t">
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClass(
                        action.priority,
                      )}`}
                    >
                      {action.priority}
                    </span>
                  </td>

                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(
                        action.status,
                      )}`}
                    >
                      {action.status}
                    </span>
                  </td>

                  <td className="px-4 py-2 font-medium text-slate-900">
                    {action.customer || "—"}
                  </td>

                  <td className="max-w-xl px-4 py-2">
                    <p className="font-medium text-slate-900">{action.title}</p>

                    {action.recommended_action ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {action.recommended_action}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-2 text-slate-700">
                    {action.owner_label || "Sin asignar"}
                  </td>

                  <td className="px-4 py-2 text-right text-slate-700">
                    {action.notes_count}
                  </td>

                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/analytics/executive/actions/${action.id}`}
                      className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Gestionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}