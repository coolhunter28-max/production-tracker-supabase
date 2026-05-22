import Link from "next/link";

import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsTableShell } from "@/components/analytics/analytics-table-shell";

import type { ExecutiveActionQueueRow } from "@/lib/analytics/executive-actions";

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

function getPriorityCount(
  actions: ExecutiveActionQueueRow[],
  priority: string
) {
  return actions.filter((action) => action.priority === priority).length;
}

function getStatusCount(actions: ExecutiveActionQueueRow[], status: string) {
  return actions.filter((action) => action.status === status).length;
}

export function ExecutiveActionQueue({ actions }: Props) {
  const visibleActions = actions.slice(0, 10);

  const criticalCount = getPriorityCount(actions, "CRITICAL");
  const highCount = getPriorityCount(actions, "HIGH");
  const openCount = getStatusCount(actions, "OPEN");
  const waitingCount = getStatusCount(actions, "WAITING");

  const hasCritical = criticalCount > 0;
  const hasHigh = highCount > 0;

  return (
    <AnalyticsTableShell
      variant={hasCritical ? "risk" : "executive"}
      title="Executive Action Queue"
      description="Acciones ejecutivas generadas desde señales BI."
      rowCount={actions.length}
      density="compact"
      maxHeightClassName="max-h-[560px]"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 ${
                hasCritical
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "bg-white"
              }`}
            >
              Critical: {criticalCount}
            </span>

            <span
              className={`rounded-full border px-2 py-1 ${
                hasHigh
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "bg-white"
              }`}
            >
              High: {highCount}
            </span>

            <span className="rounded-full border bg-white px-2 py-1">
              Open: {openCount}
            </span>

            <span className="rounded-full border bg-white px-2 py-1">
              Waiting: {waitingCount}
            </span>
          </div>

          <div>
            {visibleActions.length < actions.length
              ? `Mostrando ${visibleActions.length} de ${actions.length}`
              : "Todas las acciones visibles"}
          </div>
        </div>
      }
    >
      {visibleActions.length === 0 ? (
        <div className="p-5">
          <AnalyticsEmptyState
            title="Sin acciones ejecutivas"
            description="No hay acciones abiertas para revisar en este momento."
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 shadow-sm">
            <tr>
              <th className="bg-slate-50 px-4 py-2 font-medium">
                Priority
              </th>

              <th className="bg-slate-50 px-4 py-2 font-medium">
                Status
              </th>

              <th className="bg-slate-50 px-4 py-2 font-medium">
                Customer
              </th>

              <th className="bg-slate-50 px-4 py-2 font-medium">
                Action
              </th>

              <th className="bg-slate-50 px-4 py-2 font-medium">
                Owner
              </th>

              <th className="bg-slate-50 px-4 py-2 text-right font-medium">
                Notes
              </th>

              <th className="bg-slate-50 px-4 py-2 text-right font-medium" />
            </tr>
          </thead>

          <tbody>
            {visibleActions.map((action) => (
              <tr
                key={action.id}
                className={`border-t transition hover:bg-slate-50 ${
                  action.priority === "CRITICAL"
                    ? "bg-rose-50/30"
                    : action.priority === "HIGH"
                      ? "bg-orange-50/20"
                      : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClass(
                      action.priority
                    )}`}
                  >
                    {action.priority}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(
                      action.status
                    )}`}
                  >
                    {action.status}
                  </span>
                </td>

                <td className="px-4 py-3 font-medium text-slate-900">
                  {action.customer || "—"}
                </td>

                <td className="max-w-xl px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {action.title}
                  </p>

                  {action.recommended_action ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {action.recommended_action}
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {action.owner_label || "Sin asignar"}
                </td>

                <td className="px-4 py-3 text-right text-slate-700">
                  {action.notes_count}
                </td>

                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/analytics/executive/actions/${action.id}`}
                    className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Gestionar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AnalyticsTableShell>
  );
}