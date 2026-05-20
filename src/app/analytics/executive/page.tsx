import Link from "next/link";
import {
  getExecutiveDashboardData,
  getExecutiveFilterOptions,
} from "@/lib/analytics/queries/executive";
import { getCustomerCommercialAlerts } from "@/lib/analytics/clientes";
import {
  buildExecutiveIntelligenceKPIs,
  type ExecutiveIntelligenceSignal,
} from "@/lib/analytics/executive-intelligence";
import { getExecutiveNarrative } from "@/lib/analytics/executive-narrative";
import {
  buildExecutiveCrossModuleKPIs,
  getExecutiveCrossModuleRisk,
} from "@/lib/analytics/executive-cross-module";
import {
  buildExecutiveCorrelationKPIs,
  getExecutiveCorrelationSignals,
} from "@/lib/analytics/executive-correlations";
import {
  buildExecutiveActionKPIs,
  buildExecutiveWorkflowKPIs,
  getExecutiveActionLifecycle,
  getExecutiveActionQueue,
} from "@/lib/analytics/executive-actions";
import { ExecutiveIntelligenceBoard } from "@/components/analytics/executive/ExecutiveIntelligenceBoard";
import { ExecutiveNarrativePanel } from "@/components/analytics/executive/ExecutiveNarrativePanel";
import { ExecutiveCorrelationBoard } from "@/components/analytics/executive/ExecutiveCorrelationBoard";
import { ExecutiveActionQueue } from "@/components/analytics/executive/ExecutiveActionQueue";
import { createClient } from "@/lib/supabase";
import type { ExecutiveFilters } from "@/lib/analytics/types/executive";
import type { CustomerCommercialAlert } from "@/types/clientes";

type ExecutivePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type GenericRow = Record<string, unknown>;

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const cleanValue = rawValue?.trim();

  return cleanValue ? cleanValue : undefined;
}

function parseExecutiveFilters(
  params: Record<string, string | string[] | undefined>
): ExecutiveFilters {
  const dateType = getSingleParam(params.dateType);

  return {
    season: getSingleParam(params.season),
    customer: getSingleParam(params.customer),
    factory: getSingleParam(params.factory),
    dateType:
      dateType === "po" ||
      dateType === "pi_etd" ||
      dateType === "finish" ||
      dateType === "shipping"
        ? dateType
        : "shipping",
    dateFrom: getSingleParam(params.dateFrom),
    dateTo: getSingleParam(params.dateTo),
  };
}

function buildQueryString(
  params: Record<string, string | string[] | undefined>
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const cleanValue = getSingleParam(value);
    if (cleanValue) query.set(key, cleanValue);
  });

  return query.toString();
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "-";

  if (typeof value === "number") {
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "boolean") return value ? "Sí" : "No";

  return String(value);
}

function CompactMetric({
  label,
  value,
  isPct = false,
}: {
  label: string;
  value: unknown;
  isPct?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {value === null || value === undefined
          ? "-"
          : isPct
            ? `${formatValue(value)}%`
            : formatValue(value)}
      </p>
    </div>
  );
}

function ExecutiveHeroCard({
  label,
  value,
  subtitle,
  isPct = false,
  delta,
  deltaType = "pct",
  previousSeason,
  href,
}: {
  label: string;
  value: unknown;
  subtitle: string;
  isPct?: boolean;
  delta?: number | null;
  deltaType?: "pct" | "pp";
  previousSeason?: string | null;
  href?: string;
}) {
  const numericValue = typeof value === "number" ? value : null;

  const valueClass =
    isPct && numericValue !== null
      ? numericValue >= 15
        ? "text-emerald-600"
        : numericValue >= 10
          ? "text-amber-600"
          : "text-red-600"
      : "";

  const hasDelta = delta !== null && delta !== undefined;
  const isPositive = typeof delta === "number" && delta > 0;
  const isNegative = typeof delta === "number" && delta < 0;

  const deltaClass = isPositive
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : isNegative
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-slate-50 text-slate-600 ring-slate-200";

  const content = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <p className={`text-3xl font-semibold tracking-tight ${valueClass}`}>
          {value === null || value === undefined
            ? "-"
            : isPct
              ? `${formatValue(value)}%`
              : formatValue(value)}
        </p>

        {hasDelta ? (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${deltaClass}`}
          >
            {isPositive ? "▲" : isNegative ? "▼" : "→"}{" "}
            {isPositive ? "+" : ""}
            {formatValue(delta)}
            {deltaType === "pp" ? "pp" : "%"}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {subtitle}
        {previousSeason ? ` · vs ${previousSeason}` : ""}
      </p>

      {href ? (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Click para profundizar →
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">{content}</div>
  );
}

function KpiGrid({ rows }: { rows: GenericRow[] }) {
  const kpi = rows[0] ?? {};

  return (
    <section className="space-y-4">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Performance</h2>
          <p className="text-sm text-muted-foreground">
            Resultado principal del filtro actual.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ExecutiveHeroCard
            label="Ventas"
            value={kpi.sell_amount_total}
            delta={kpi.sell_amount_delta_pct as number | null}
            previousSeason={kpi.previous_season as string | null}
            subtitle="Facturación"
            href="/analytics/operaciones"
          />

          <ExecutiveHeroCard
            label="Margen total"
            value={kpi.contribution_total}
            delta={kpi.contribution_delta_pct as number | null}
            previousSeason={kpi.previous_season as string | null}
            subtitle="Beneficio estimado"
            href="/analytics/clientes"
          />

          <ExecutiveHeroCard
            label="Margen %"
            value={kpi.contribution_pct}
            delta={kpi.contribution_pct_delta_pp as number | null}
            deltaType="pp"
            previousSeason={kpi.previous_season as string | null}
            isPct
            subtitle="Rentabilidad ponderada"
            href="/analytics/clientes"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Mix operativo</h2>
          <p className="text-xs text-muted-foreground">
            Peso de cada operativa sobre ventas.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <CompactMetric
              label="Mix Xiamen"
              value={kpi.xiamen_sales_mix_pct}
              isPct
            />
            <CompactMetric label="Mix BSG" value={kpi.bsg_sales_mix_pct} isPct />
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Margen por operativa</h2>
          <p className="text-xs text-muted-foreground">
            Rentabilidad real de cada modelo.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <CompactMetric
              label="Margen Xiamen"
              value={kpi.xiamen_margin_pct}
              isPct
            />
            <CompactMetric label="Margen BSG" value={kpi.bsg_margin_pct} isPct />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Actividad</h2>
        <p className="text-xs text-muted-foreground">
          Volumen operativo del filtro actual.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <CompactMetric label="POs" value={kpi.po_count} />
          <CompactMetric label="Líneas" value={kpi.line_count} />
          <CompactMetric label="Qty" value={kpi.qty_total} />
          <CompactMetric label="Factories" value={kpi.factory_count} />
        </div>
      </section>
    </section>
  );
}

function ExecutiveIntelligenceSummary({
  total,
  critical,
  warning,
  monitor,
  healthy,
}: {
  total: number;
  critical: number;
  warning: number;
  monitor: number;
  healthy: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <CompactMetric label="Signals" value={total} />
      <CompactMetric label="Critical" value={critical} />
      <CompactMetric label="Warning" value={warning} />
      <CompactMetric label="Monitor" value={monitor} />
      <CompactMetric label="Healthy" value={healthy} />
    </section>
  );
}

function AlertBadge({
  level,
}: {
  level: CustomerCommercialAlert["alert_level"];
}) {
  const className =
    level === "CRITICAL"
      ? "bg-red-100 text-red-700 ring-red-200"
      : level === "WARNING"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-blue-100 text-blue-700 ring-blue-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {level}
    </span>
  );
}

function CrossModuleRiskBadge({ level }: { level: string }) {
  const className =
    level === "CRITICAL"
      ? "bg-red-100 text-red-700 ring-red-200"
      : level === "WARNING"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-blue-100 text-blue-700 ring-blue-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {level}
    </span>
  );
}

function CrossModuleDriverBadge({ driver }: { driver: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {driver}
    </span>
  );
}

function buildOperacionesCustomerHref(
  customer: string,
  filters: ExecutiveFilters
) {
  const query = new URLSearchParams();
  query.set("customer", customer);

  if (filters.season) query.set("season", filters.season);
  if (filters.dateType) query.set("dateType", filters.dateType);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);

  return `/analytics/operaciones/customers?${query.toString()}`;
}

function CommercialPriorityStrip({
  alerts,
  filters,
}: {
  alerts: CustomerCommercialAlert[];
  filters: ExecutiveFilters;
}) {
  const selectedCustomer = filters.customer?.trim().toLowerCase();

  const visibleAlerts = selectedCustomer
    ? alerts.filter(
        (alert) => alert.customer.trim().toLowerCase() === selectedCustomer
      )
    : alerts;

  const criticalAlerts = visibleAlerts.filter(
    (alert) => alert.alert_level === "CRITICAL"
  );

  const warningAlerts = visibleAlerts.filter(
    (alert) => alert.alert_level === "WARNING"
  );

  const priorityAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 5);

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Commercial Priority</h2>
          <p className="text-sm text-muted-foreground">
            {selectedCustomer
              ? "Prioridad comercial filtrada por customer."
              : "Solo clientes CRITICAL y WARNING desde vw_customer_commercial_alerts."}
          </p>
        </div>

        <Link
          href="/analytics/clientes"
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Ver Situation Board
        </Link>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-red-50 p-4">
            <p className="text-xs font-medium text-red-700">CRITICAL</p>
            <p className="mt-1 text-3xl font-semibold text-red-900">
              {criticalAlerts.length}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Requieren revisión inmediata.
            </p>
          </div>

          <div className="rounded-xl border bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">WARNING</p>
            <p className="mt-1 text-3xl font-semibold text-amber-900">
              {warningAlerts.length}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Requieren seguimiento comercial.
            </p>
          </div>
        </div>

        {priorityAlerts.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No hay prioridades comerciales para el filtro actual.
          </div>
        ) : (
          <div className="space-y-3">
            {priorityAlerts.map((alert) => (
              <div
                key={`${alert.customer}-${alert.alert_type}`}
                className="rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{alert.customer}</p>
                      <AlertBadge level={alert.alert_level} />
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.contextual_business_profile ?? "Sin perfil"} ·{" "}
                      {alert.alert_type.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/analytics/clientes/${encodeURIComponent(
                        alert.customer
                      )}`}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Ver cliente
                    </Link>

                    <Link
                      href={buildOperacionesCustomerHref(alert.customer, filters)}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Ver operaciones
                    </Link>
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium">
                  {alert.alert_reason ?? "Sin motivo disponible"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.recommended_action ?? "Sin acción recomendada"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function ExecutivePage({
  searchParams,
}: ExecutivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseExecutiveFilters(resolvedSearchParams);
  const queryString = buildQueryString(resolvedSearchParams);
  const supabase = await createClient();

  const [
    data,
    filterOptions,
    alerts,
    intelligenceResponse,
    narrativeRows,
    crossModuleRows,
    correlationRows,
    actionRows,
    lifecycleRows,
  ] = await Promise.all([
    getExecutiveDashboardData(filters),
    getExecutiveFilterOptions(),
    getCustomerCommercialAlerts(supabase),
    supabase.rpc("get_exec_intelligence_focus_season_v1", {
      p_season: filters.season ?? null,
      p_customer: filters.customer ?? null,
      p_factory: filters.factory ?? null,
      p_alert_level: null,
      p_source_module: null,
    }),
    getExecutiveNarrative({
      season: filters.season ?? null,
      customer: filters.customer ?? null,
      factory: filters.factory ?? null,
    }),
    getExecutiveCrossModuleRisk(),
    getExecutiveCorrelationSignals(),
    getExecutiveActionQueue(),
    getExecutiveActionLifecycle(),
  ]);

  const intelligenceRows =
    (intelligenceResponse.data ?? []) as ExecutiveIntelligenceSignal[];

  const intelligenceKpis = buildExecutiveIntelligenceKPIs(intelligenceRows);
  const crossModuleKpis = buildExecutiveCrossModuleKPIs(crossModuleRows);
  const correlationKpis = buildExecutiveCorrelationKPIs(correlationRows);
  const actionKpis = buildExecutiveActionKPIs(actionRows);
  const workflowKpis = buildExecutiveWorkflowKPIs(lifecycleRows);

  const levelPriority: Record<string, number> = {
    CRITICAL: 0,
    WARNING: 1,
    MONITOR: 2,
    HEALTHY: 3,
  };

  const sortedCrossModuleRows = [...crossModuleRows].sort((a, b) => {
    const levelDiff =
      (levelPriority[a.cross_module_risk_level] ?? 999) -
      (levelPriority[b.cross_module_risk_level] ?? 999);

    if (levelDiff !== 0) return levelDiff;

    return (
      (b.cross_module_risk_score ?? 0) -
      (a.cross_module_risk_score ?? 0)
    );
  });

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel de situación: performance, narrativa y acciones prioritarias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analytics/clientes"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Clientes
          </Link>
          <Link
            href="/analytics/operaciones/customers"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Operaciones
          </Link>
          <Link
            href="/analytics/desarrollo/customers"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Desarrollo
          </Link>
        </div>
      </header>

      <section className="sticky top-0 z-20 rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur">
        <form method="get" className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Season
            </label>

            <select
              name="season"
              defaultValue={filters.season ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Todas</option>

              {filterOptions.seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Customer
            </label>

            <select
              name="customer"
              defaultValue={filters.customer ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Todos</option>

              {filterOptions.customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Factory
            </label>

            <select
              name="factory"
              defaultValue={filters.factory ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Todas</option>

              {filterOptions.factories.map((factory) => (
                <option key={factory} value={factory}>
                  {factory}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Date Type
            </label>

            <select
              name="dateType"
              defaultValue={filters.dateType ?? "shipping"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="shipping">Shipping</option>
              <option value="po">PO</option>
              <option value="pi_etd">PI ETD</option>
              <option value="finish">Finish</option>
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Aplicar filtros
            </button>

            <Link
              href="/analytics/executive"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </Link>
          </div>
        </form>
      </section>

      <KpiGrid rows={(data.kpis ?? []) as GenericRow[]} />

      <ExecutiveNarrativePanel rows={narrativeRows} queryString={queryString} />

      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <CompactMetric
            label="Workflow Health"
            value={workflowKpis.workflowHealth}
          />

          <CompactMetric
            label="Without Owner"
            value={workflowKpis.withoutOwner}
          />

          <CompactMetric
            label="Critical Aging"
            value={workflowKpis.criticalAging}
          />

          <CompactMetric
            label="Escalations"
            value={workflowKpis.escalations}
          />

          <CompactMetric label="Stale" value={workflowKpis.stale} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <CompactMetric label="Total Actions" value={actionKpis.total} />
          <CompactMetric label="Open" value={actionKpis.open} />
          <CompactMetric label="In Progress" value={actionKpis.inProgress} />
          <CompactMetric label="Waiting" value={actionKpis.waiting} />
          <CompactMetric label="Critical" value={actionKpis.critical} />
          <CompactMetric label="Resolved" value={actionKpis.resolved} />
        </div>

        <ExecutiveActionQueue actions={actionRows} />
      </section>

      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Executive Intelligence
              </p>
              <h2 className="text-lg font-semibold">
                Señales ejecutivas detectadas
              </h2>
              <p className="text-sm text-muted-foreground">
                Desplegar solo cuando haga falta explicar el origen de las acciones.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-lg font-semibold">
                  {intelligenceKpis.critical}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Warning</p>
                <p className="text-lg font-semibold">
                  {intelligenceKpis.warning}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Monitor</p>
                <p className="text-lg font-semibold">
                  {intelligenceKpis.monitor}
                </p>
              </div>
            </div>
          </div>
        </summary>

        <div className="space-y-4 border-t p-5">
          <ExecutiveIntelligenceSummary {...intelligenceKpis} />
          <ExecutiveIntelligenceBoard
            rows={intelligenceRows}
            queryString={queryString}
          />
        </div>
      </details>

      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Commercial Priority
              </p>
              <h2 className="text-lg font-semibold">Alertas comerciales</h2>
              <p className="text-sm text-muted-foreground">
                Priorización comercial contextual generada por BI.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {alerts.length} alertas
            </span>
          </div>
        </summary>

        <div className="border-t p-5">
          <CommercialPriorityStrip alerts={alerts} filters={filters} />
        </div>
      </details>

      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cross-module Risk
              </p>
              <h2 className="text-lg font-semibold">
                Riesgo transversal por cliente
              </h2>
              <p className="text-sm text-muted-foreground">
                Desplegar para revisar drivers y explicación BI.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-lg font-semibold">
                  {crossModuleKpis.critical}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Warning</p>
                <p className="text-lg font-semibold">
                  {crossModuleKpis.warning}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Monitor</p>
                <p className="text-lg font-semibold">
                  {crossModuleKpis.monitor}
                </p>
              </div>
            </div>
          </div>
        </summary>

        <div className="space-y-3 border-t p-5">
          {sortedCrossModuleRows.length === 0 ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">
              No hay riesgo transversal para el filtro actual.
            </div>
          ) : (
            sortedCrossModuleRows.slice(0, 8).map((row) => (
              <div key={row.customer} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{row.customer}</p>
                      <CrossModuleRiskBadge
                        level={row.cross_module_risk_level}
                      />
                      <CrossModuleDriverBadge driver={row.primary_driver} />
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {row.executive_summary}
                    </p>
                  </div>

                  <Link
                    href={`/analytics/clientes/${encodeURIComponent(
                      row.customer
                    )}`}
                    className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    Ver cliente
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Executive Correlations
              </p>
              <h2 className="text-lg font-semibold">
                Correlaciones entre módulos
              </h2>
              <p className="text-sm text-muted-foreground">
                Patrones BI explicativos entre comercial, operaciones, desarrollo y QC.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-lg font-semibold">
                  {correlationKpis.critical}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Warning</p>
                <p className="text-lg font-semibold">
                  {correlationKpis.warning}
                </p>
              </div>
              <div className="rounded-xl border px-3 py-2">
                <p className="text-xs text-muted-foreground">Monitor</p>
                <p className="text-lg font-semibold">
                  {correlationKpis.monitor}
                </p>
              </div>
            </div>
          </div>
        </summary>

        <div className="border-t p-5">
          <ExecutiveCorrelationBoard rows={correlationRows} />
        </div>
      </details>
    </div>
  );
}