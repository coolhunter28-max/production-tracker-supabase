import Link from "next/link";
import {
  buildCustomerBusinessKPIs,
  getCustomerBusinessFilterOptions,
  getCustomerBusinessMatrix,
  getCustomerHealthSignals,
  parseClientesSearchParams,
} from "@/lib/analytics/clientes";
import { createClient } from "@/lib/supabase";
import type {
  CustomerBusinessMatrixRow,
  CustomerBusinessProfile,
} from "@/types/clientes";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type HealthSignal =
  | "HEALTHY"
  | "MONITOR"
  | "WARNING"
  | "CRITICAL"
  | "STABLE"
  | "NEUTRAL"
  | "-";

const HEALTH_ORDER: HealthSignal[] = [
  "CRITICAL",
  "WARNING",
  "MONITOR",
  "HEALTHY",
  "NEUTRAL",
  "-",
];

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatProfileLabel(profile: string | null | undefined) {
  switch (profile) {
    case "CRITICAL_XIAMEN":
      return "CRITICAL (Xiamen)";
    case "WATCH_XIAMEN":
      return "WATCH (Xiamen)";
    case "GROWING_XIAMEN":
      return "GROWING (Xiamen)";
    case "NEW_OR_UNTRACKED_XIAMEN":
      return "NEW / UNTRACKED (Xiamen)";
    case "DEMANDING_XIAMEN":
    case "DEMANDING (Xiamen)":
      return "DEMANDING (Xiamen)";
    default:
      return profile ?? "-";
  }
}

function getProfileBadgeClass(profile: string | null | undefined) {
  switch (profile) {
    case "GROWING_XIAMEN":
    case "STRATEGIC":
    case "PROFITABLE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "NEW_OR_UNTRACKED_XIAMEN":
    case "DEMANDING_XIAMEN":
    case "WATCH_XIAMEN":
    case "NEGOTIATOR":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CRITICAL_XIAMEN":
    case "RISKY":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getHealthBadgeClass(health: HealthSignal) {
  switch (health) {
    case "HEALTHY":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "MONITOR":
    case "STABLE":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "WARNING":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CRITICAL":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getVolumeSignalBadgeClass(signal: string | null | undefined) {
  switch (signal) {
    case "VOLUME_DROP_RISK":
      return "bg-red-50 text-red-700 ring-red-200";
    case "VOLUME_SOFT_DROP":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "GROWING":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "NO_BASELINE":
      return "bg-slate-50 text-slate-700 ring-slate-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getHealthSectionClass(health: HealthSignal) {
  switch (health) {
    case "CRITICAL":
      return "border-red-200 bg-red-50/50";
    case "WARNING":
      return "border-amber-200 bg-amber-50/50";
    case "MONITOR":
    case "STABLE":
      return "border-blue-200 bg-blue-50/50";
    case "HEALTHY":
      return "border-emerald-200 bg-emerald-50/50";
    default:
      return "border-slate-200 bg-slate-50/50";
  }
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function buildClearHref() {
  return "/analytics/clientes";
}

export default async function AnalyticsClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseClientesSearchParams(resolvedSearchParams);
  const supabase = await createClient();

  const rows = await getCustomerBusinessMatrix(supabase, filters);
  const healthSignals = await getCustomerHealthSignals(supabase);

  const filterOptions = getCustomerBusinessFilterOptions(rows);
  const kpis = buildCustomerBusinessKPIs(rows);

  const groupedByHealth = rows.reduce((acc, row) => {
    const health =
      (healthSignals[row.customer]?.health_signal as HealthSignal | undefined) ??
      "NEUTRAL";

    if (!acc[health]) acc[health] = [];
    acc[health].push(row);

    return acc;
  }, {} as Record<HealthSignal, CustomerBusinessMatrixRow[]>);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Analytics · Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer Situation Board sobre{" "}
            <span className="font-medium">vw_customer_business_contextual</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analytics/executive"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Executive
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

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="customer" className="text-sm font-medium">
              Customer
            </label>
            <select
              id="customer"
              name="customer"
              defaultValue={filters.customer}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {filterOptions.customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="profile" className="text-sm font-medium">
              Profile
            </label>
            <select
              id="profile"
              name="profile"
              defaultValue={filters.profile}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {filterOptions.profiles.map((profile) => (
                <option key={profile} value={profile}>
                  {formatProfileLabel(profile)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="sort" className="text-sm font-medium">
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="business_score.desc">Prioridad negocio</option>
              <option value="friction_score.desc">Friction Score ↓</option>
              <option value="friction_score.asc">Friction Score ↑</option>
              <option value="customer.asc">Customer A-Z</option>
              <option value="customer.desc">Customer Z-A</option>
            </select>
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Aplicar filtros
            </button>

            <Link
              href={buildClearHref()}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Total Customers" value={kpis.totalCustomers} />
        <KpiCard title="Strategic" value={kpis.strategicCustomers} />
        <KpiCard title="Profitable" value={kpis.profitableCustomers} />
        <KpiCard title="Risky" value={kpis.riskyCustomers} />
        <KpiCard
          title="Avg Business Score"
          value={formatNumber(kpis.avgBusinessScore, 2)}
        />
        <KpiCard
          title="Avg Friction Score"
          value={formatNumber(kpis.avgFrictionScore, 2)}
        />
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Customer Situation Board</h2>
            <p className="text-sm text-muted-foreground">
              Vista ejecutiva por prioridad: primero riesgo, después seguimiento
              y crecimiento.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length} registros
          </div>
        </div>

        <div className="space-y-4 p-5">
          {rows.length === 0 ? (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
              No hay datos para los filtros actuales.
            </div>
          ) : (
            HEALTH_ORDER.map((health) => {
              const group = groupedByHealth[health];
              if (!group || group.length === 0) return null;

              return (
                <section
                  key={health}
                  className={`rounded-2xl border p-4 ${getHealthSectionClass(
                    health
                  )}`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Badge className={getHealthBadgeClass(health)}>
                      {health}
                    </Badge>
                    <h3 className="text-sm font-semibold">
                      {group.length} cliente{group.length === 1 ? "" : "s"}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.map((row) => {
                      const healthData = healthSignals[row.customer];
                      const rowHealth =
                        (healthData?.health_signal as HealthSignal | undefined) ??
                        "NEUTRAL";

                      return (
                        <Link
                          key={row.customer}
                          href={`/analytics/clientes/${encodeURIComponent(
                            row.customer
                          )}`}
                          className="rounded-xl border bg-white p-4 shadow-sm transition hover:bg-muted/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{row.customer}</p>
                              <div className="mt-2">
                                <Badge
                                  className={getProfileBadgeClass(
                                    row.customer_business_profile
                                  )}
                                >
                                  {formatProfileLabel(
                                    row.customer_business_profile
                                  )}
                                </Badge>
                              </div>
                            </div>

                            <Badge className={getHealthBadgeClass(rowHealth)}>
                              {rowHealth}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Business
                              </p>
                              <p className="font-medium">
                                {formatNumber(row.customer_business_score, 2)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">
                                Friction
                              </p>
                              <p className="font-medium">
                                {formatNumber(row.customer_friction_score, 2)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3">
                            {healthData?.volume_signal ? (
                              <Badge
                                className={getVolumeSignalBadgeClass(
                                  healthData.volume_signal
                                )}
                              >
                                {healthData.volume_signal}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Sin señal de volumen
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}