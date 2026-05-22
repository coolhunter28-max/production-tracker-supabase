import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsTableShell } from "@/components/analytics/analytics-table-shell";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsPageHeader } from "@/components/navigation/analytics-page-header";
import {
  getDevelopmentCustomerPressure,
  getDevelopmentFilterOptions,
  getDevelopmentNegotiationScores,
  parseDevelopmentFilters,
} from "@/lib/analytics/desarrollo";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercentFromRatio(
  value: number | null | undefined,
  digits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value * 100, digits)}%`;
}

function formatPercentValue(
  value: number | null | undefined,
  digits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)}%`;
}

function pressureBadgeClass(level: string | null | undefined): string {
  switch (level) {
    case "LOW_PRESSURE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "MEDIUM_PRESSURE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "HIGH_PRESSURE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-muted bg-muted text-muted-foreground";
  }
}

function negotiationBadgeClass(profile: string | null | undefined): string {
  switch (profile) {
    case "EASY":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NORMAL":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "AGGRESSIVE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-muted bg-muted text-muted-foreground";
  }
}

function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function mergeCustomerDatasets(
  pressureRows: Awaited<ReturnType<typeof getDevelopmentCustomerPressure>>,
  negotiationRows: Awaited<ReturnType<typeof getDevelopmentNegotiationScores>>
) {
  const negotiationMap = new Map(
    negotiationRows.map((row) => [`${row.customer ?? ""}__${row.season ?? ""}`, row])
  );

  return pressureRows.map((row) => {
    const key = `${row.customer ?? ""}__${row.season ?? ""}`;
    const negotiation = negotiationMap.get(key);

    return {
      customer: row.customer ?? "—",
      season: row.season ?? "—",
      quote_count: row.quote_count,
      avg_gap_vs_master_sell_pct: row.avg_gap_vs_master_sell_pct,
      avg_quote_margin_pct: row.avg_quote_margin_pct,
      avg_revision_count: row.avg_revision_count,
      avg_gap_order_vs_quote_sell_pct: row.avg_gap_order_vs_quote_sell_pct,
      pressure_level: row.pressure_level ?? "—",
      negotiation_score: negotiation?.negotiation_score ?? null,
      negotiation_profile: negotiation?.negotiation_profile ?? "—",
      avg_days_to_order: negotiation?.avg_days_to_order ?? null,
    };
  });
}

export default async function DevelopmentCustomersAnalyticsPage({
  searchParams = {},
}: PageProps) {
  const filters = parseDevelopmentFilters(searchParams);

  const [pressureRows, negotiationRows, filterOptions] = await Promise.all([
    getDevelopmentCustomerPressure(filters),
    getDevelopmentNegotiationScores(filters),
    getDevelopmentFilterOptions(),
  ]);

  const rows = mergeCustomerDatasets(pressureRows, negotiationRows);
  const hasRows = rows.length > 0;

  const sharedQuery = {
    ...(filters.customer ? { customer: filters.customer } : {}),
    ...(filters.season ? { season: filters.season } : {}),
  };

  const quotesQuery = {
    ...sharedQuery,
    ...(filters.quoteStatus ? { quoteStatus: filters.quoteStatus } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  };

  return (
    <AnalyticsPageShell title="Desarrollo · Customers">
      <AnalyticsPageHeader
        title="Desarrollo · Customers"
        description="Análisis de presión comercial, negociación y comportamiento quote-to-order por customer."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Analytics" },
          { label: "Desarrollo", href: "/analytics/desarrollo" },
          { label: "Customers" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/analytics/desarrollo", query: sharedQuery }}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Overview
          </Link>

          <Link
            href={{ pathname: "/analytics/desarrollo/quotes", query: quotesQuery }}
            className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Quotes
          </Link>
        </div>

        <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {hasRows ? `${formatNumber(rows.length)} customers analizados` : "Sin resultados"}
        </div>
      </div>

      <AnalyticsSection
        title="Filtros"
        description="Filtra presión comercial y comportamiento de negociación por customer y season."
      >
        <form method="GET" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="customer" className="text-sm font-medium">
              Customer
            </label>

            <select
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ""}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            >
              <option value="">All customers</option>
              {filterOptions.customers.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="season" className="text-sm font-medium">
              Season
            </label>

            <select
              id="season"
              name="season"
              defaultValue={filters.season ?? ""}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            >
              <option value="">All seasons</option>
              {filterOptions.seasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Apply
            </button>

            <Link
              href="/analytics/desarrollo/customers"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </AnalyticsSection>

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay datos de customers para estos filtros"
          description="Prueba otro customer o season para visualizar presión comercial y negociación."
        />
      ) : (
        <AnalyticsTableShell
          title="Customer pressure & negotiation"
          description="Vista operacional combinando presión comercial, margen, revisiones y perfil de negociación."
          rowCount={rows.length}
          density="compact"
          maxHeightClassName="max-h-[620px]"
        >
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-20 bg-card px-4 py-3 text-left">Customer</th>
                <th className="sticky left-[180px] z-20 bg-card px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-right">Quotes</th>
                <th className="px-4 py-3 text-right">Gap vs Master %</th>
                <th className="px-4 py-3 text-right">Avg Margin %</th>
                <th className="px-4 py-3 text-right">Avg Revisions</th>
                <th className="px-4 py-3 text-right">Gap Order vs Quote %</th>
                <th className="px-4 py-3 text-left">Pressure</th>
                <th className="px-4 py-3 text-right">Negotiation Score</th>
                <th className="px-4 py-3 text-left">Negotiation Profile</th>
                <th className="px-4 py-3 text-right">Avg Days to Order</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.customer}-${row.season}-${index}`}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="sticky left-0 bg-card px-4 py-3 font-medium whitespace-nowrap">
                    {row.customer}
                  </td>
                  <td className="sticky left-[180px] bg-card px-4 py-3 whitespace-nowrap">
                    {row.season}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatNumber(row.quote_count)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatPercentValue(row.avg_gap_vs_master_sell_pct)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatPercentFromRatio(row.avg_quote_margin_pct)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatNumber(row.avg_revision_count, 2)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatPercentValue(row.avg_gap_order_vs_quote_sell_pct)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${pressureBadgeClass(row.pressure_level)}`}>
                      {humanizeEnum(row.pressure_level)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatNumber(row.negotiation_score, 2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${negotiationBadgeClass(row.negotiation_profile)}`}>
                      {humanizeEnum(row.negotiation_profile)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatNumber(row.avg_days_to_order, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnalyticsTableShell>
      )}
    </AnalyticsPageShell>
  );
}