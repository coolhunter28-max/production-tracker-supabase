import Link from 'next/link'
import {
  getDevelopmentConversionByCustomer,
  getDevelopmentCustomerRanking,
  getDevelopmentFilterOptions,
  getDevelopmentSummary,
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

function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return `${formatNumber(value, 1)} d`
}

export default async function DevelopmentAnalyticsPage({
  searchParams = {},
}: PageProps) {
  const filters = parseDevelopmentFilters(searchParams)

  const [summary, customerRanking, conversionRanking, filterOptions] =
    await Promise.all([
      getDevelopmentSummary(filters),
      getDevelopmentCustomerRanking(filters),
      getDevelopmentConversionByCustomer(filters),
      getDevelopmentFilterOptions(),
    ])

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
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Desarrollo</h1>
          <p className="text-sm text-muted-foreground">
            Pricing, negotiation and quote conversion analytics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: '/analytics/desarrollo', query: sharedQuery }}
            className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
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
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Quotes
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-base font-medium">Filters</h2>
          <p className="text-sm text-muted-foreground">
            Filter development analytics by customer and season.
          </p>
        </div>

        <form method="GET" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="flex items-end gap-2 md:col-span-2 xl:justify-start">
            <button
              type="submit"
              className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Apply
            </button>

            <Link
              href="/analytics/desarrollo"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Quotes</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatNumber(summary?.quote_count)}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Customers</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatNumber(summary?.customer_count)}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Avg Margin %</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatPercentFromRatio(summary?.avg_quote_margin_pct)}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Avg Gap vs Master %</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatPercentValue(summary?.avg_gap_vs_master_sell_pct)}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Customer Negotiation & Conversion</h2>
            <Link
              href={{
                pathname: '/analytics/desarrollo/customers',
                query: sharedQuery,
              }}
              className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              View customer detail
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Executive ranking of negotiation intensity and commercial conversion by
            customer.
          </p>
        </div>

        <div className="overflow-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-card">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Quotes</th>
                <th className="px-4 py-3 text-left">Matched Orders</th>
                <th className="px-4 py-3 text-left">Conversion %</th>
                <th className="px-4 py-3 text-left">Avg Revisions</th>
                <th className="px-4 py-3 text-left">Rank Negotiation</th>
              </tr>
            </thead>
            <tbody>
              {customerRanking.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No customer ranking data found.
                  </td>
                </tr>
              ) : (
                customerRanking.map((item, index) => (
                  <tr
                    key={`${item.customer ?? 'unknown'}-${item.season ?? 'na'}-${index}`}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{item.customer ?? '—'}</td>
                    <td className="px-4 py-3">{item.season ?? '—'}</td>
                    <td className="px-4 py-3">{formatNumber(item.quote_count)}</td>
                    <td className="px-4 py-3">{formatNumber(item.matched_order_count)}</td>
                    <td className="px-4 py-3">
                      {formatPercentValue(item.approx_conversion_rate_pct)}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(item.avg_revision_count, 2)}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item.rank_negotiation)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Quote to Order Conversion</h2>
            <Link
              href={{
                pathname: '/analytics/desarrollo/quotes',
                query: quotesQuery,
              }}
              className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              View quotes
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Commercial efficiency of quotes converted into matched orders.
          </p>
        </div>

        <div className="overflow-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-card">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Quotes</th>
                <th className="px-4 py-3 text-left">Matched Orders</th>
                <th className="px-4 py-3 text-left">Conversion %</th>
                <th className="px-4 py-3 text-left">Avg Days</th>
                <th className="px-4 py-3 text-left">Avg Revisions</th>
              </tr>
            </thead>
            <tbody>
              {conversionRanking.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No conversion data found.
                  </td>
                </tr>
              ) : (
                conversionRanking.map((item, index) => (
                  <tr
                    key={`${item.customer ?? 'unknown'}-${item.season ?? 'na'}-${index}`}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{item.customer ?? '—'}</td>
                    <td className="px-4 py-3">{item.season ?? '—'}</td>
                    <td className="px-4 py-3">{formatNumber(item.quote_count)}</td>
                    <td className="px-4 py-3">{formatNumber(item.matched_order_count)}</td>
                    <td className="px-4 py-3">
                      {formatPercentValue(item.approx_conversion_rate_pct)}
                    </td>
                    <td className="px-4 py-3">{formatDays(item.avg_days_quote_to_order)}</td>
                    <td className="px-4 py-3">
                      {formatNumber(item.avg_revision_count, 2)}
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