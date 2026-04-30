import Link from "next/link";
import {
  getCustomerBusinessMatrix,
  getCustomerBusinessFilterOptions,
  getCustomerHealthSignals,
  parseClientesSearchParams,
} from "@/lib/analytics/clientes";
import { createClient } from "@/lib/supabase";
import type { CustomerBusinessMatrixRow } from "@/types/clientes";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type HealthSignal =
  | "CRITICAL"
  | "WARNING"
  | "MONITOR"
  | "HEALTHY"
  | "NEUTRAL";

const HEALTH_ORDER: HealthSignal[] = [
  "CRITICAL",
  "WARNING",
  "MONITOR",
  "HEALTHY",
  "NEUTRAL",
];

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
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
      return "DEMANDING (Xiamen)";
    default:
      return profile ?? "-";
  }
}

function getHealthClass(health: HealthSignal) {
  switch (health) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-900";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "MONITOR":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "HEALTHY":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getBadgeClass(health: HealthSignal) {
  switch (health) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 ring-red-200";
    case "WARNING":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    case "MONITOR":
      return "bg-blue-100 text-blue-700 ring-blue-200";
    case "HEALTHY":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getDriverClass(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-muted-foreground";
  if (value <= -30) return "text-red-700";
  if (value < 0) return "text-amber-700";
  if (value > 0) return "text-emerald-700";
  return "text-muted-foreground";
}

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export default async function AnalyticsClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseClientesSearchParams(resolvedSearchParams);
  const supabase = await createClient();

  const rows = await getCustomerBusinessMatrix(supabase, {
    ...filters,
    sort: "business_score.desc",
  });

  const healthSignals = await getCustomerHealthSignals(supabase);
  const filterOptions = getCustomerBusinessFilterOptions(rows);

  const healthCounts: Record<HealthSignal, number> = {
    CRITICAL: 0,
    WARNING: 0,
    MONITOR: 0,
    HEALTHY: 0,
    NEUTRAL: 0,
  };

  for (const row of rows) {
    const health =
      (healthSignals[row.customer]?.health_signal as HealthSignal | undefined) ??
      "NEUTRAL";

    healthCounts[health] = (healthCounts[health] ?? 0) + 1;
  }

  const avgBusiness =
    rows.reduce((sum, row) => sum + (row.customer_business_score ?? 0), 0) /
    (rows.length || 1);

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
        <form method="get" className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Aplicar filtros
            </button>

            <Link
              href="/analytics/clientes"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Total" value={rows.length} />
        <KpiCard title="Critical" value={healthCounts.CRITICAL} />
        <KpiCard title="Warning" value={healthCounts.WARNING} />
        <KpiCard title="Monitor" value={healthCounts.MONITOR} />
        <KpiCard title="Healthy" value={healthCounts.HEALTHY} />
        <KpiCard
          title="Avg Business Score"
          value={formatNumber(avgBusiness, 2)}
        />
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Customer Situation Board</h2>
            <p className="text-sm text-muted-foreground">
              Vista ejecutiva por prioridad: riesgo, seguimiento y crecimiento.
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
                  className={`rounded-2xl border p-4 ${getHealthClass(
                    health
                  )}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge label={health} className={getBadgeClass(health)} />
                      <h3 className="text-sm font-semibold">
                        {group.length} cliente{group.length === 1 ? "" : "s"}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.map((row) => {
                      const healthData = healthSignals[row.customer];
                      const rowHealth =
                        (healthData?.health_signal as HealthSignal | undefined) ??
                        "NEUTRAL";

                      const qtyGrowth = healthData?.qty_growth_pct;
                      const sellGrowth = healthData?.sell_growth_pct;

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
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatProfileLabel(
                                  row.customer_business_profile
                                )}
                              </p>
                            </div>
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

                          <div className="mt-4 space-y-2">
                            {healthData?.volume_signal ? (
                              <Badge
                                label={healthData.volume_signal}
                                className="bg-slate-100 text-slate-700 ring-slate-200"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Sin señal de volumen
                              </span>
                            )}

                            {(qtyGrowth !== null && qtyGrowth !== undefined) ||
                            (sellGrowth !== null &&
                              sellGrowth !== undefined) ? (
                              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-slate-50 p-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">
                                    Qty growth
                                  </p>
                                  <p
                                    className={`font-semibold ${getDriverClass(
                                      qtyGrowth
                                    )}`}
                                  >
                                    {formatPercent(qtyGrowth, 2)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-muted-foreground">
                                    Sell growth
                                  </p>
                                  <p
                                    className={`font-semibold ${getDriverClass(
                                      sellGrowth
                                    )}`}
                                  >
                                    {formatPercent(sellGrowth, 2)}
                                  </p>
                                </div>
                              </div>
                            ) : null}

                            {healthData?.health_reason &&
                            (rowHealth === "CRITICAL" ||
                              rowHealth === "WARNING") ? (
                              <p className="text-xs text-muted-foreground">
                                {healthData.health_reason}
                              </p>
                            ) : null}
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