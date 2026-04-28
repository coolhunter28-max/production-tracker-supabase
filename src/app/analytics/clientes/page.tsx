import Link from "next/link";
import {
  getCustomerBusinessMatrix,
  getCustomerHealthSignals,
  getCustomerBusinessFilterOptions,
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
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
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

  const rows = await getCustomerBusinessMatrix(supabase, filters);
  const healthSignals = await getCustomerHealthSignals(supabase);

  const filterOptions = getCustomerBusinessFilterOptions(rows);

  // KPIs por estado
  const healthCounts = {
    CRITICAL: 0,
    WARNING: 0,
    MONITOR: 0,
    HEALTHY: 0,
    NEUTRAL: 0,
  };

  rows.forEach((row) => {
    const health =
      healthSignals[row.customer]?.health_signal ?? "NEUTRAL";
    if (healthCounts[health as HealthSignal] !== undefined) {
      healthCounts[health as HealthSignal]++;
    }
  });

  const avgBusiness =
    rows.reduce((sum, r) => sum + (r.customer_business_score ?? 0), 0) /
    (rows.length || 1);

  const groupedByHealth = rows.reduce((acc, row) => {
    const health =
      healthSignals[row.customer]?.health_signal ?? "NEUTRAL";
    if (!acc[health]) acc[health] = [];
    acc[health].push(row);
    return acc;
  }, {} as Record<string, CustomerBusinessMatrixRow[]>);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Clientes</h1>

      {/* KPIs */}
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

      {/* Board */}
      <section className="space-y-4">
        {HEALTH_ORDER.map((health) => {
          const group = groupedByHealth[health];
          if (!group || group.length === 0) return null;

          return (
            <div key={health} className="space-y-2">
              <h2 className="text-lg font-semibold">
                {health} ({group.length})
              </h2>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.map((row) => (
                  <Link
                    key={row.customer}
                    href={`/analytics/clientes/${row.customer}`}
                    className="rounded-xl border bg-white p-4 shadow-sm hover:bg-muted"
                  >
                    <p className="font-medium">{row.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      Score: {formatNumber(row.customer_business_score)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}