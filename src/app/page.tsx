import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ClipboardList,
  Factory,
  GitBranch,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";

import { getExecutiveActionQueue } from "@/lib/analytics/executive-actions";
import { getExecutiveDailyBrief } from "@/lib/analytics/executive-daily-brief";

function asText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function priorityStyle(priority?: string | null) {
  if (priority === "CRITICAL") return "border-red-300 bg-red-50 text-red-900";
  if (priority === "WARNING") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-white text-slate-800";
}

function getActionId(action: unknown) {
  const row = action as Record<string, unknown>;
  return asText(row.action_id ?? row.id ?? row.queue_id, "unknown");
}

function getActionPriority(action: unknown) {
  const row = action as Record<string, unknown>;
  return asText(row.priority ?? row.risk_level ?? row.severity, "INFO");
}

function getActionTitle(action: unknown) {
  const row = action as Record<string, unknown>;
  return asText(
    row.title ?? row.action_title ?? row.recommended_action,
    "Acción ejecutiva",
  );
}

function getActionModule(action: unknown) {
  const row = action as Record<string, unknown>;
  return asText(row.source_module ?? row.module ?? row.area, "Executive");
}

function getActionStatus(action: unknown) {
  const row = action as Record<string, unknown>;
  return asText(row.status ?? row.action_status, "OPEN");
}

export default async function HomePage() {
  const [dailyBrief, actionQueue] = await Promise.all([
    getExecutiveDailyBrief(),
    getExecutiveActionQueue(),
  ]);

  const priorityActions = actionQueue
    .filter((action) => {
      const priority = getActionPriority(action);
      return priority === "CRITICAL" || priority === "WARNING";
    })
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center gap-4">
          <Image
            src="/logo-bsg.png"
            alt="BSG Logo"
            width={56}
            height={56}
            priority
          />

          <div>
            <p className="text-sm font-medium text-slate-500">
              Production Tracker
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Command Center
            </h1>
            <p className="text-sm text-slate-600">
              Qué mirar hoy. Prioridades reales, navegación rápida y cero ruido.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
        <CommandCard
  title="Executive Today"
  icon={<Zap className="h-5 w-5" />}
  href="/analytics/executive"
  value={dailyBrief?.critical_open ?? 0}
  label="acciones críticas"
  critical
/>

<CommandCard
  title="Production Today"
  icon={<Factory className="h-5 w-5" />}
  href="/analytics/operaciones"
  value={dailyBrief?.critical_customers ?? 0}
  label="clientes críticos"
/>

<CommandCard
  title="QC Today"
  icon={<ShieldCheck className="h-5 w-5" />}
  href="/analytics/quality"
  value={dailyBrief?.warning_customers ?? 0}
  label="clientes warning"
/>

<CommandCard
  title="Development Today"
  icon={<GitBranch className="h-5 w-5" />}
  href="/analytics/desarrollo"
  value={dailyBrief?.total_actions ?? 0}
  label="acciones abiertas"
/>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-base font-semibold text-slate-950">
                Priority Actions
              </h2>
            </div>

            {priorityActions.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay acciones críticas o warning pendientes.
              </div>
            ) : (
              <div className="space-y-2">
                {priorityActions.map((action) => {
                  const actionId = getActionId(action);
                  const priority = getActionPriority(action);

                  return (
                    <Link
                      key={actionId}
                      href={`/analytics/executive?action=${actionId}`}
                      className={`block rounded-lg border p-3 text-sm transition hover:shadow-sm ${priorityStyle(
                        priority,
                      )}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {getActionTitle(action)}
                          </p>
                          <p className="mt-1 text-xs opacity-80">
                            {getActionModule(action)} · {getActionStatus(action)}
                          </p>
                        </div>

                        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
                          {priority}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Panel
              title="Quick Navigation"
              icon={<ClipboardList className="h-5 w-5" />}
            >
              <QuickLink href="/analytics/executive" label="Executive Analytics" />
              <QuickLink href="/analytics/operaciones" label="Operaciones Analytics" />
              <QuickLink href="/analytics/quality" label="Quality Analytics" />
              <QuickLink href="/analytics/desarrollo" label="Desarrollo Analytics" />
              <QuickLink href="/analytics/clientes" label="Clientes / Business Matrix" />
            </Panel>

            <Panel title="Operativa diaria" icon={<Upload className="h-5 w-5" />}>
              <QuickLink href="/produccion/pos" label="Lista de POs" />
              <QuickLink href="/produccion/dashboard" label="Dashboard producción" />
              <QuickLink href="/import" label="Importar datos" />
              <QuickLink href="/qc" label="QC inspecciones" />
              <QuickLink href="/qc/upload" label="Subir QC" />
              <QuickLink href="/alertas" label="Alertas" />
              <QuickLink href="/analytics/situation" label="Situation / Visual Analytics" />
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function CommandCard({
  title,
  icon,
  href,
  value,
  label,
  critical = false,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  value: number;
  label: string;
  critical?: boolean;
}) {
  const isCritical = critical && value > 0;

  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 shadow-sm transition hover:shadow-sm ${
        isCritical ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-slate-700">{icon}</div>
        <span className="text-2xl font-semibold text-slate-950">{value}</span>
      </div>

      <div className="mt-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Link>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-700">
        {icon}
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>

      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}