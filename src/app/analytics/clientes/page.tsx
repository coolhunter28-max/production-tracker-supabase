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

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getProfileBadgeClass(profile: string | null | undefined) {
  switch (profile) {
    case "STRATEGIC":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "PROFITABLE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "NEGOTIATOR":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "DEMANDING (Xiamen)":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "RISKY":
      return "bg-red-50 text-red-700 ring-red-200";
    case "LOW_VALUE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
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
    case "STABLE":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "NO_BASELINE":
      return "bg-slate-50 text-slate-700 ring-slate-200";
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
    case "NEUTRAL":
    case "-":
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function getContextualProfileLabel(
  profile: string | null | undefined,
  hasXiamenContext: boolean
) {
  if (profile === "RISKY" && hasXiamenContext) {
    return "DEMANDING (Xiamen)";
  }

  return profile ?? "-";
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

function ProfileBadge({
  profile,
}: {
  profile: CustomerBusinessProfile | string | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getProfileBadgeClass(
        profile
      )}`}
    >
      {profile ?? "-"}
    </span>
  );
}

function HealthBadge({ health }: { health: HealthSignal }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getHealthBadgeClass(
        health
      )}`}
    >
      {health}
    </span>
  );
}

function VolumeSignalBadge({ signal }: { signal: string | null | undefined }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getVolumeSignalBadgeClass(
        signal
      )}`}
    >
      {signal ?? "-"}
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

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Analytics · Clientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Business Matrix overview sobre{" "}
              <span className="font-medium">vw_customer_business_matrix</span>
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
                  {profile}
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
              <option value="business_score.desc">Business Score ↓</option>
              <option value="business_score.asc">Business Score ↑</option>
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
            <h2 className="text-lg font-semibold">Customer ranking</h2>
            <p className="text-sm text-muted-foreground">
              Lectura ejecutiva de perfil, salud, fricción y evolución de
              volumen Xiamen
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length} registros
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Profile</th>
                <th className="px-5 py-3 font-medium">Health</th>
                <th className="px-5 py-3 font-medium">Volume Signal</th>
                <th className="px-5 py-3 font-medium">Business Score</th>
                <th className="px-5 py-3 font-medium">Friction Score</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    No hay datos para los filtros actuales.
                  </td>
                </tr>
              ) : (
                rows.map((row: CustomerBusinessMatrixRow) => {
                  const healthData = healthSignals[row.customer];
                  const hasXiamenContext =
                    healthData?.xiamen_context_flag === true ||
                    Boolean(healthData?.volume_signal);

                  const profileLabel = getContextualProfileLabel(
                    row.customer_business_profile,
                    hasXiamenContext
                  );

                  const health =
                    (healthData?.health_signal as HealthSignal | undefined) ??
                    "-";

                  return (
                    <tr key={row.customer} className="border-t">
                      <td className="px-5 py-4 font-medium">{row.customer}</td>

                      <td className="px-5 py-4">
                        <ProfileBadge profile={profileLabel} />
                      </td>

                      <td className="px-5 py-4">
                        <HealthBadge health={health} />
                      </td>

                      <td className="px-5 py-4">
                        {healthData?.volume_signal ? (
                          <VolumeSignalBadge
                            signal={healthData.volume_signal}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {formatNumber(row.customer_business_score, 2)}
                      </td>

                      <td className="px-5 py-4">
                        {formatNumber(row.customer_friction_score, 2)}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/analytics/clientes/${encodeURIComponent(
                            row.customer
                          )}`}
                          className="inline-flex rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}