import Link from 'next/link'
import {
  getDevelopmentFilterOptions,
  getDevelopmentQuoteVsOrder,
  parseDevelopmentFilters,
} from '@/lib/analytics/desarrollo'

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatCurrency(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return formatNumber(value, digits)
}

function formatPercentFromRatio(
  value: number | null | undefined,
  digits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${formatNumber(value * 100, digits)}%`
}

function formatPercentValue(
  value: number | null | undefined,
  digits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${formatNumber(value, digits)}%`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'aprobada':
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'negociando':
    case 'negotiating':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'rechazada':
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-muted bg-muted text-muted-foreground'
  }
}

function humanizeStatus(status: string | null | undefined): string {
  if (!status) return '—'
  return status.replace(/_/g, ' ')
}

export default async function DevelopmentQuotesAnalyticsPage({
  searchParams = {},
}: PageProps) {
  const filters = parseDevelopmentFilters(searchParams)

  const [rows, filterOptions] = await Promise.all([
    getDevelopmentQuoteVsOrder(filters),
    getDevelopmentFilterOptions(),
  ])

  const totalQuotes = rows.length
  const matchedOrders = rows.filter((row) => row.po_id || row.po_number).length
  const rowsWithDays = rows.filter(
    (row) => row.days_quote_to_order !== null && row.days_quote_to_order !== undefined
  )
  const avgDaysToOrder =
    rowsWithDays.length > 0
      ? rowsWithDays.reduce((sum, row) => sum + (row.days_quote_to_order ?? 0), 0) /
        rowsWithDays.length
      : null

  const sharedQuery = {
    ...(filters.customer ? { customer: filters.customer } : {}),
    ...(filters.season ? { season: filters.season } : {}),
  }

  const quotesQuery = {
    ...sharedQuery,
    ...(filters.quoteStatus ? { quoteStatus: filters.quoteStatus } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium">
            Analytics
          </span>
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium">
            Desarrollo
          </span>
          <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium">
            Quotes
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Desarrollo — Quotes
          </h1>
          <p className="text-sm text-muted-foreground">
            Quote-level drill-down with status, pricing, conversion and quote-to-order
            comparison.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={{
              pathname: '/analytics/desarrollo',
              query: sharedQuery,
            }}
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Overview
          </Link>
          <Link
            href={{
              pathname: '/analytics/desarrollo/customers',
              query: sharedQuery,
            }}
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Customers
          </Link>
          <Link
            href={{
              pathname: '/analytics/desarrollo/quotes',
              query: quotesQuery,
            }}
            className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Quotes
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-base font-medium">Filters</h2>
          <p className="text-sm text-muted-foreground">
            Filter quote detail by customer, season, status and quote date.
          </p>
        </div>

        <form method="GET" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <label htmlFor="customer" className="text-sm font-medium">
              Customer
            </label>
            <select
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ''}
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
              defaultValue={filters.season ?? ''}
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
              defaultValue={filters.quoteStatus ?? ''}
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
              defaultValue={filters.dateFrom ?? ''}
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
              defaultValue={filters.dateTo ?? ''}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-5">
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Quotes</div>
          <div className="mt-2 text-2xl font-semibold">{formatNumber(totalQuotes)}</div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Matched Orders</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatNumber(matchedOrders)}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Avg Days to Order</div>
          <div className="mt-2 text-2xl font-semibold">
            {avgDaysToOrder === null ? '—' : `${formatNumber(avgDaysToOrder, 1)} d`}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">Quotes Detail</h2>
          <p className="text-sm text-muted-foreground">
            Detailed quote rows with pricing, status and matched order comparison.
          </p>
        </div>

        <div className="overflow-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[1800px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Quote Date</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Style</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Factory</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Revision No</th>
                <th className="px-4 py-3 text-left">Total Revisions</th>
                <th className="px-4 py-3 text-left">Quote Buy</th>
                <th className="px-4 py-3 text-left">Quote Sell</th>
                <th className="px-4 py-3 text-left">Margin %</th>
                <th className="px-4 py-3 text-left">Margin Amount</th>
                <th className="px-4 py-3 text-left">PO Number</th>
                <th className="px-4 py-3 text-left">Order Factory</th>
                <th className="px-4 py-3 text-left">Gap Order vs Quote %</th>
                <th className="px-4 py-3 text-left">Days Quote → Order</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={18}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No quotes found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={`${row.cotizacion_id ?? 'quote'}-${index}`}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">{formatDate(row.quote_date)}</td>
                    <td className="px-4 py-3 font-medium">{row.customer ?? '—'}</td>
                    <td className="px-4 py-3">{row.season ?? '—'}</td>
                    <td className="px-4 py-3">{row.style ?? '—'}</td>
                    <td className="px-4 py-3">{row.reference ?? '—'}</td>
                    <td className="px-4 py-3">{row.color ?? '—'}</td>
                    <td className="px-4 py-3">{row.quote_factory ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          row.quote_status
                        )}`}
                      >
                        {humanizeStatus(row.quote_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(row.revision_no_inferred)}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(row.revision_count_inferred)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.quote_buy_price, 2)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.quote_sell_price, 2)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentFromRatio(row.quote_margin_pct)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(row.quote_margin_amount, 2)}
                    </td>
                    <td className="px-4 py-3">{row.po_number ?? '—'}</td>
                    <td className="px-4 py-3">{row.order_factory ?? '—'}</td>
                    <td className="px-4 py-3">
                      {formatPercentValue(row.gap_order_vs_quote_sell_pct)}
                    </td>
                    <td className="px-4 py-3">
                      {row.days_quote_to_order === null
                        ? '—'
                        : `${formatNumber(row.days_quote_to_order, 1)} d`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}