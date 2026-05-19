import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addExecutiveActionDecision,
  addExecutiveActionNote,
  assignExecutiveActionOwner,
  getExecutiveActionById,
  getExecutiveActionDecisions,
  getExecutiveActionNotes,
  updateExecutiveActionStatus,
  type ExecutiveActionStatus,
} from "@/lib/analytics/executive-actions";

type PageProps = {
  params: {
    id: string;
  };
};

function badgeClass(value: string) {
  if (value === "CRITICAL") return "bg-red-50 text-red-700 border-red-200";
  if (value === "HIGH") return "bg-orange-50 text-orange-700 border-orange-200";
  if (value === "OPEN") return "bg-blue-50 text-blue-700 border-blue-200";
  if (value === "IN_PROGRESS") return "bg-purple-50 text-purple-700 border-purple-200";
  if (value === "WAITING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (value === "RESOLVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number(value).toLocaleString("es-ES");
  return String(value);
}

async function updateStatusAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as ExecutiveActionStatus;
  const resolutionNote = String(formData.get("resolutionNote") || "");

  await updateExecutiveActionStatus({
    id,
    status,
    resolutionNote,
  });

  redirect(`/analytics/executive/actions/${id}`);
}

async function assignOwnerAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const ownerLabel = String(formData.get("ownerLabel") || "").trim();

  await assignExecutiveActionOwner({
    id,
    ownerLabel: ownerLabel || null,
  });

  redirect(`/analytics/executive/actions/${id}`);
}

async function addNoteAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const note = String(formData.get("note") || "");

  await addExecutiveActionNote({
    actionId: id,
    note,
    createdByLabel: "Executive",
  });

  redirect(`/analytics/executive/actions/${id}`);
}

async function addDecisionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const decisionReason = String(formData.get("decisionReason") || "");

  await addExecutiveActionDecision({
    actionId: id,
    decision,
    decisionReason,
    decisionByLabel: "Executive",
  });

  redirect(`/analytics/executive/actions/${id}`);
}

export default async function ExecutiveActionDetailPage({ params }: PageProps) {
  const [action, notes, decisions] = await Promise.all([
    getExecutiveActionById(params.id),
    getExecutiveActionNotes(params.id),
    getExecutiveActionDecisions(params.id),
  ]);

  if (!action) {
    notFound();
  }

  const metadata = action.metadata || {};

  const riskMetrics: Array<[string, unknown]> = [
    ["Risk score", metadata.cross_module_risk_score],
    ["Risk level", metadata.cross_module_risk_level],
    ["Primary driver", metadata.primary_driver],
    ["Alert reason", metadata.alert_reason],
    ["Health signal", metadata.health_signal],
    ["Volume signal", metadata.volume_signal],
    ["Qty growth %", metadata.qty_growth_pct],
    ["Sell growth %", metadata.sell_growth_pct],
    ["Friction score", metadata.customer_friction_score],
    ["Contribution %", metadata.contribution_pct],
    ["Production late %", metadata.production_late_rate_pct],
    ["Avg delay days", metadata.avg_delay_production_days],
    ["Negotiation profile", metadata.negotiation_profile],
    ["Avg revisions", metadata.avg_revisions],
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/analytics/executive"
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            ← Volver a Executive
          </Link>

          {action.customer ? (
            <Link
              href={`/analytics/clientes/${encodeURIComponent(action.customer)}`}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Ver cliente
            </Link>
          ) : null}
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(action.priority)}`}>
                  {action.priority}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(action.status)}`}>
                  {action.status}
                </span>
                {action.customer ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {action.customer}
                  </span>
                ) : null}
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {action.title}
              </h1>

              {action.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
              <p className="mt-1 font-semibold text-slate-950">
                {action.owner_label || "Sin asignar"}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Fuente: {action.source_type}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Acción recomendada
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {action.recommended_action || "No hay recomendación registrada."}
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Señal BI original
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot ejecutivo guardado al generar la acción. No se recalcula en UI.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {riskMetrics.map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {formatValue(value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Gestión
            </h2>

            <form action={assignOwnerAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={action.id} />
              <label className="block text-sm font-medium text-slate-700">
                Owner
              </label>
              <input
                name="ownerLabel"
                defaultValue={action.owner_label || ""}
                placeholder="Ej: Dirección, Comercial, Operaciones"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Guardar owner
              </button>
            </form>

            <form action={updateStatusAction} className="mt-6 space-y-3">
              <input type="hidden" name="id" value={action.id} />
              <label className="block text-sm font-medium text-slate-700">
                Estado
              </label>
              <select
                name="status"
                defaultValue={action.status}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="WAITING">WAITING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>

              <textarea
                name="resolutionNote"
                placeholder="Nota de resolución si aplica"
                className="min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
              />

              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Actualizar estado
              </button>
            </form>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Añadir nota
            </h2>

            <form action={addNoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={action.id} />
              <textarea
                name="note"
                placeholder="Escribe una nota de seguimiento..."
                className="min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Guardar nota
              </button>
            </form>

            <h2 className="mt-8 text-lg font-semibold text-slate-950">
              Registrar decisión
            </h2>

            <form action={addDecisionAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={action.id} />
              <input
                name="decision"
                placeholder="Decisión tomada"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <textarea
                name="decisionReason"
                placeholder="Motivo / contexto"
                className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Guardar decisión
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Notes Timeline
            </h2>

            <div className="mt-4 space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-slate-500">Sin notas todavía.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-sm text-slate-800">{note.note}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(note.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Decision History
            </h2>

            <div className="mt-4 space-y-3">
              {decisions.length === 0 ? (
                <p className="text-sm text-slate-500">Sin decisiones todavía.</p>
              ) : (
                decisions.map((decision) => (
                  <div key={decision.id} className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      {decision.decision}
                    </p>
                    {decision.decision_reason ? (
                      <p className="mt-1 text-sm text-slate-700">
                        {decision.decision_reason}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(decision.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}