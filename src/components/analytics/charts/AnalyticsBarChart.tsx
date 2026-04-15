import Link from 'next/link'
import { AnalyticsBarChart } from '@/components/analytics/charts/AnalyticsBarChart'
import { AnalyticsPageShell } from '@/components/analytics/layout/AnalyticsPageShell'
import { AnalyticsRankingTable } from '@/components/analytics/tables/AnalyticsRankingTable'
import { AnalyticsSectionHeader } from '@/components/analytics/layout/AnalyticsSectionHeader'
import {
  getDevelopmentConversionByCustomer,
  getDevelopmentCustomerRanking,
  getDevelopmentSummary,
  parseDevelopmentFilters,
} from '@/lib/analytics/desarrollo'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return `${formatNumber(value, digits)}%`
}

function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'

  return `${formatNumber(value, 1)} d`
}

export default async function DevelopmentAnalyticsPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filters = parseDevelopmentFilters(resolvedSearchParams)

  const [summary, customerRanking, conversionRanking] = await Promise.all([
    getDevelopmentSummary(filters),
    getDevelopmentCustomerRanking(filters),
    getDevelopmentConversionByCustomer(filters),
  ])

  const rankingChartRows = customerRanking.map((item) => ({
    customer: item.customer ?? 'N/A',
    approx_conversion_rate_pct: item.approx_conversion_rate_pct ?? 0,
  }))

  const conversionChartRows = conversionRanking.map((item) => ({
    customer: item.customer ?? 'N/A',
    approx_conversion_rate_pct: item.approx_conversion_rate_pct ?? 0,
  }))

  return (
    <AnalyticsPageShell
      title="Desarrollo"
      description="Pricing, negotiation and quote conversion analytics."
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-background p-5">
            <div className="text-sm text-muted-foreground">Quotes</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatNumber(summary?.quote_count)}
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <div className="text-sm text-muted-foreground">Customers</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatNumber(summary?.customer_count)}
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <div className="text-sm text-muted-foreground">Avg Margin %</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatPercent(summary?.avg_quote_margin_pct)}
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <div className="text-sm text-muted-foreground">Avg Gap vs Master %</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatPercent(summary?.avg_gap_vs_master_sell_pct)}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <AnalyticsSectionHeader
            title="Customer Negotiation & Conversion"
            description="Executive ranking of customer negotiation intensity and commercial conversion."
            action={
              <Link
                href="/analytics/desarrollo/customers"
                className="text-sm font-medium text-primary hover:underline"
              >
                View customer detail
              </Link>
            }
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsRankingTable
              title="Customer ranking"
              rows={customerRanking.map((item) => ({
                key: `${item.customer ?? 'unknown'}-${item.season ?? 'na'}`,
                values: [
                  item.customer ?? '—',
                  item.season ?? '—',
                  formatNumber(item.quote_count),
                  formatNumber(item.matched_order_count),
                  formatPercent(item.approx_conversion_rate_pct),
                  formatNumber(item.avg_revision_count, 2),
                  formatNumber(item.rank_negotiation),
                ],
              }))}
              columns={[
                'Customer',
                'Season',
                'Quotes',
                'Matched Orders',
                'Conversion %',
                'Avg Revisions',
                'Rank Negotiation',
              ]}
              emptyMessage="No customer ranking data found."
            />

            <AnalyticsBarChart
              title="Conversion % by customer"
              rows={rankingChartRows}
              labelKeys={['customer']}
              valueKeys={['approx_conversion_rate_pct']}
              maxItems={10}
            />
          </div>
        </section>

        <section className="space-y-4">
          <AnalyticsSectionHeader
            title="Quote to Order Conversion"
            description="Commercial efficiency of quotes converted into matched orders."
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsRankingTable
              title="Conversion by customer"
              rows={conversionRanking.map((item) => ({
                key: `${item.customer ?? 'unknown'}-${item.season ?? 'na'}`,
                values: [
                  item.customer ?? '—',
                  item.season ?? '—',
                  formatNumber(item.quote_count),
                  formatNumber(item.matched_order_count),
                  formatPercent(item.approx_conversion_rate_pct),
                  formatDays(item.avg_days_quote_to_order),
                  formatNumber(item.avg_revision_count, 2),
                ],
              }))}
              columns={[
                'Customer',
                'Season',
                'Quotes',
                'Matched Orders',
                'Conversion %',
                'Avg Days',
                'Avg Revisions',
              ]}
              emptyMessage="No conversion data found."
            />

            <AnalyticsBarChart
              title="Quote to order conversion"
              rows={conversionChartRows}
              labelKeys={['customer']}
              valueKeys={['approx_conversion_rate_pct']}
              maxItems={10}
            />
          </div>
        </section>
      </div>
    </AnalyticsPageShell>
  )
}