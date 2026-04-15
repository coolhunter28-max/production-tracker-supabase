import Link from 'next/link'
import {
  getDevelopmentCustomerPressure,
  getDevelopmentFilterOptions,
  getDevelopmentNegotiationScores,
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

function pressureBadgeClass(level: string | null | undefined): string {
  switch (level) {
    case 'LOW_PRESSURE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'MEDIUM_PRESSURE':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'HIGH_PRESSURE':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-muted bg-muted text-muted-foreground'
  }
}

function negotiationBadgeClass(profile: string | null | undefined): string {
  switch (profile) {
    case 'EASY':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'NORMAL':
      return 'border-slate-200 bg-slate-50 text-slate-700'
    case 'AGGRESSIVE':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-muted bg-muted text-muted-foreground'
  }
}

function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

function mergeCustomerDatasets(
  pressureRows: Awaited<ReturnType<typeof getDevelopmentCustomerPressure>>,
  negotiationRows: Awaited<ReturnType<typeof getDevelopmentNegotiationScores>>
) {
  const negotiationMap = new Map(
    negotiationRows.map((row) => [
      `${row.customer ?? ''}__${row.season ?? ''}`,
      row,
    ])
  )

  return pressureRows.map((row) => {
    const key = `${row.customer ?? ''}__${row.season ?? ''}`
    const negotiation = negotiationMap.get(key)

    return {
      customer: row.customer ?? '—',
      season: row.season ?? '—',
      quote_count: row.quote_count,
      avg_gap_vs_master_sell_pct: row.avg_gap_vs_master_sell_pct,
      avg_quote_margin_pct: row.avg_quote_margin_pct,
      avg_revision_count: row.avg_revision_count,
      avg_gap_order_vs_quote_sell_pct: row.avg_gap_order_vs_quote_sell_pct,
      pressure_level: row.pressure_level ?? '—',
      negotiation_score: negotiation?.negotiation_score ?? null,
      negotiation_profile: negotiation?.negotiation_profile ?? '—',
      avg_days_to_order: negotiation?.avg_days_to_order ?? null,
    }
  })
}

export default async function DevelopmentCustomersAnalyticsPage({
  searchParams = {},
}: PageProps) {
  const filters = parseDevelopmentFilters(searchParams)

  const [pressureRows, negotiationRows, filterOptions] = await Promise.all([
    getDevelopmentCustomerPressure(filters),
    getDevelopmentNegotiationScores(filters),
    getDevelopmentFilterOptions(),
  ])

  const rows = mergeCustomerDatasets(pressureRows, negotiationRows)

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
            Customers
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Desarrollo — Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer pricing pressure and negotiation profile analysis.
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
            className="rounded-xl border bg-foreground px-4 py-2 text-sm font-medium text-background"
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
            Filter customer pressure and negotiation analysis by customer and season.
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
              href="/analytics/desarrollo/customers"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Customer Pressure & Negotiation</h2>
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
            Detailed customer view combining pressure against master pricing and
            negotiation profile.
          </p>
        </div>

        <div className="overflow-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Quotes</th>
                <th className="px-4 py-3 text-left">Gap vs Master %</th>
                <th className="px-4 py-3 text-left">Avg Margin %</th>
                <th className="px-4 py-3 text-left">Avg Revisions</th>
                <th className="px-4 py-3 text-left">Gap Order vs Quote %</th>
                <th className="px-4 py-3 text-left">Pressure</th>
                <th className="px-4 py-3 text-left">Negotiation Score</th>
                <th className="px-4 py-3 text-left">Negotiation Profile</th>
                <th className="px-4 py-3 text-left">Avg Days to Order</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No customer pressure data found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={`${row.customer}-${row.season}-${index}`}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{row.customer}</td>
                    <td className="px-4 py-3">{row.season}</td>
                    <td className="px-4 py-3">{formatNumber(row.quote_count)}</td>
                    <td className="px-4 py-3">
                      {formatPercentValue(row.avg_gap_vs_master_sell_pct)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentFromRatio(row.avg_quote_margin_pct)}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(row.avg_revision_count, 2)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPercentValue(row.avg_gap_order_vs_quote_sell_pct)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${pressureBadgeClass(
                          row.pressure_level
                        )}`}
                      >
                        {humanizeEnum(row.pressure_level)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(row.negotiation_score, 2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${negotiationBadgeClass(
                          row.negotiation_profile
                        )}`}
                      >
                        {humanizeEnum(row.negotiation_profile)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(row.avg_days_to_order, 1)}
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