import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsSection } from "@/components/analytics/analytics-section";
import { AnalyticsTableShell } from "@/components/analytics/analytics-table-shell";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsPageHeader } from "@/components/navigation/analytics-page-header";
import { AnalyticsKpiCard } from "@/components/analytics/analytics-kpi-card";
import {
  getDevelopmentFilterOptions,
  getDevelopmentQuoteVsOrder,
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

function formatCurrency(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return formatNumber(value, digits);
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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "aprobada":
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "negociando":
    case "negotiating":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "rechazada":
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    default:
      return "border-muted bg-muted text-muted-foreground";
  }
}

function humanizeStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export default async function DevelopmentQuotesAnalyticsPage({
  searchParams = {},
}: PageProps) {
  const filters = parseDevelopmentFilters(searchParams);

  const [rows, filterOptions] = await Promise.all([
    getDevelopmentQuoteVsOrder(filters),
    getDevelopmentFilterOptions(),
  ]);

  const totalQuotes = rows.length;

  const matchedOrders = rows.filter(
    (row) => row.po_id || row.po_number
  ).length;

  const rowsWithDays = rows.filter(
    (row) =>
      row.days_quote_to_order !== null &&
      row.days_quote_to_order !== undefined
  );

  const avgDaysToOrder =
    rowsWithDays.length > 0
      ? rowsWithDays.reduce(
          (sum, row) => sum + (row.days_quote_to_order ?? 0),
          0
        ) / rowsWithDays.length
      : null;

  const sharedQuery = {
    ...(filters.customer ? { customer: filters.customer } : {}),
    ...(filters.season ? { season: filters.season } : {}),
  };

  const hasRows = rows.length > 0;

  return (
    <AnalyticsPageShell title="Desarrollo · Quotes">
      <AnalyticsPageHeader
        title="Desarrollo · Quotes"
        description="Análisis operacional de quotes, pricing, conversión y tiempos de cierre."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Analytics" },
          { label: "Desarrollo", href: "/analytics/desarrollo" },
          { label: "Quotes" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={{
              pathname: "/analytics/desarrollo",
              query: sharedQuery,
            }}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Overview
          </Link>

          <Link
            href={{
              pathname: "/analytics/desarrollo/customers",
              query: sharedQuery,
            }}
            className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Customers
          </Link>
        </div>

        <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          {hasRows
            ? `${formatNumber(totalQuotes)} quotes analizadas`
            : "Sin resultados"}
        </div>
      </div>

      <AnalyticsSection
        title="Filtros"
        description="Filtra quotes por customer, season, estado y rango temporal."
      >
        <form
          method="GET"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
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

          <div className="space-y-2">
            <label htmlFor="quoteStatus" className="text-sm font-medium">
              Status
            </label>

            <select
              id="quoteStatus"
              name="quoteStatus"
              defaultValue={filters.quoteStatus ?? ""}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            >
              <option value="">All statuses</option>

              {filterOptions.quoteStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dateFrom" className="text-sm font-medium">
              Date from
            </label>

            <input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom ?? ""}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dateTo" className="text-sm font-medium">
              Date to
            </label>

            <input
              id="dateTo"
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo ?? ""}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sort" className="text-sm font-medium">
              Sort by
            </label>

            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort ?? "quote_date.desc"}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            >
              <option value="quote_date.desc">
                Latest quote date
              </option>

              <option value="quote_date.asc">
                Oldest quote date
              </option>

              <option value="customer.asc">
                Customer
              </option>

              <option value="season.asc">
                Season
              </option>

              <option value="quote_status.asc">
                Status
              </option>

              <option value="days_quote_to_order.desc">
                Days to order
              </option>
            </select>
          </div>

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-6">
            <button
              type="submit"
              className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Apply
            </button>

            <Link
              href="/analytics/desarrollo/quotes"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </AnalyticsSection>

      <section className="grid gap-4 md:grid-cols-3">
  <AnalyticsKpiCard
    title="Quotes"
    value={formatNumber(totalQuotes)}
  />

  <AnalyticsKpiCard
    title="Matched Orders"
    value={formatNumber(matchedOrders)}
  />

  <AnalyticsKpiCard
    title="Avg Days to Order"
    value={
      avgDaysToOrder === null
        ? "—"
        : `${formatNumber(avgDaysToOrder, 1)} d`
    }
  />
</section>

      {!hasRows ? (
        <AnalyticsEmptyState
          title="No hay quotes para estos filtros"
          description="Prueba otro customer, season o rango temporal para visualizar cotizaciones."
        />
      ) : (
        <AnalyticsTableShell
          variant="operational"
          title="Quotes detail"
          description="Detalle operacional quote-to-order con pricing, margen, revisiones y conversión."
          rowCount={rows.length}
          density="compact"
          maxHeightClassName="max-h-[620px]"
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border bg-white px-2 py-1">
                  Compact table
                </span>

                <span className="rounded-full border bg-white px-2 py-1">
                  Horizontal scroll enabled
                </span>

                <span className="rounded-full border bg-white px-2 py-1">
                  Quote lifecycle analytics
                </span>
              </div>

              <div>
                Sticky columns active
              </div>
            </div>
          }
        >
          <table className="w-full min-w-[1550px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-20 bg-card px-4 py-3 text-left">
                  Quote Date
                </th>

                <th className="sticky left-[120px] z-20 bg-card px-4 py-3 text-left">
                  Customer
                </th>

                <th className="px-4 py-3 text-left">Style</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">PO</th>

                <th className="px-4 py-3 text-right">Sell</th>
                <th className="px-4 py-3 text-right">Margin %</th>
                <th className="px-4 py-3 text-right">Gap %</th>
                <th className="px-4 py-3 text-right">Days</th>

                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Factory</th>

                <th className="px-4 py-3 text-right">Buy</th>
                <th className="px-4 py-3 text-right">Margin €</th>
                <th className="px-4 py-3 text-right">Revisions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const gap = row.gap_order_vs_quote_sell_pct;

                const gapColor =
                  gap === null
                    ? "text-muted-foreground"
                    : gap > 0
                      ? "text-emerald-600"
                      : "text-rose-600";

                return (
                  <tr
                    key={`${row.cotizacion_id ?? "quote"}-${index}`}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="sticky left-0 bg-card px-4 py-3 whitespace-nowrap">
                      {formatDate(row.quote_date)}
                    </td>

                    <td className="sticky left-[120px] bg-card px-4 py-3 font-medium whitespace-nowrap">
                      {row.customer ?? "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.style ?? "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.color ?? "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          row.quote_status
                        )}`}
                      >
                        {humanizeStatus(row.quote_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {row.po_number ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(row.quote_sell_price, 2)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatPercentFromRatio(row.quote_margin_pct)}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-medium whitespace-nowrap ${gapColor}`}
                    >
                      {formatPercentValue(gap)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {row.days_quote_to_order === null
                        ? "—"
                        : `${formatNumber(
                            row.days_quote_to_order,
                            1
                          )} d`}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.season ?? "—"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.quote_factory ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatCurrency(row.quote_buy_price, 2)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatCurrency(row.quote_margin_amount, 2)}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {formatNumber(
                        row.revision_count_inferred
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AnalyticsTableShell>
      )}
    </AnalyticsPageShell>
  );
}