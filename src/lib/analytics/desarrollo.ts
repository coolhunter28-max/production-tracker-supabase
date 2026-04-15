import { createClient } from '@/lib/supabase'
import type {
  DevelopmentConversionByCustomerItem,
  DevelopmentCustomerPressureItem,
  DevelopmentCustomerRankingItem,
  DevelopmentFilterOptions,
  DevelopmentFilters,
  DevelopmentNegotiationScoreItem,
  DevelopmentQuoteVsOrderItem,
  DevelopmentSummaryItem,
} from '@/types/desarrollo'

type SearchParamsValue = string | string[] | undefined
type SearchParamsInput = Record<string, SearchParamsValue>

function firstValue(value: SearchParamsValue): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function cleanString(value: SearchParamsValue): string | undefined {
  const resolved = firstValue(value)?.trim()
  if (!resolved) return undefined
  return resolved
}

function parsePage(value: SearchParamsValue): number {
  const raw = firstValue(value)

  if (!raw) return 1

  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed < 1) return 1

  return Math.floor(parsed)
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = String(value).trim()

  return parsed.length > 0 ? parsed : null
}

function applyCommonDevelopmentFilters(query: any, filters: DevelopmentFilters) {
  let nextQuery = query

  if (filters.customer) {
    nextQuery = nextQuery.eq('customer', filters.customer)
  }

  if (filters.season) {
    nextQuery = nextQuery.eq('season', filters.season)
  }

  return nextQuery
}

function applyQuoteFilters(query: any, filters: DevelopmentFilters) {
  let nextQuery = query

  if (filters.customer) {
    nextQuery = nextQuery.eq('customer', filters.customer)
  }

  if (filters.season) {
    nextQuery = nextQuery.eq('season', filters.season)
  }

  if (filters.quoteStatus) {
    nextQuery = nextQuery.eq('quote_status', filters.quoteStatus)
  }

  if (filters.dateFrom) {
    nextQuery = nextQuery.gte('quote_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    nextQuery = nextQuery.lte('quote_date', filters.dateTo)
  }

  return nextQuery
}

export function parseDevelopmentFilters(
  searchParams: SearchParamsInput
): DevelopmentFilters {
  return {
    customer: cleanString(searchParams.customer),
    season: cleanString(searchParams.season),
    quoteStatus: cleanString(searchParams.quoteStatus),
    dateFrom: cleanString(searchParams.dateFrom),
    dateTo: cleanString(searchParams.dateTo),
    sort: cleanString(searchParams.sort),
    page: parsePage(searchParams.page),
  }
}

export async function getDevelopmentSummary(
  filters: DevelopmentFilters
): Promise<DevelopmentSummaryItem | null> {
  const supabase = await createClient()

  let query = supabase
    .from('vw_dev_exec_summary')
    .select(`
      quote_count,
      customer_count,
      model_count,
      variante_count,
      season_count,
      avg_quote_buy_price,
      avg_quote_sell_price,
      avg_quote_margin_pct,
      avg_quote_margin_amount,
      avg_gap_vs_master_buy,
      avg_gap_vs_master_sell,
      avg_gap_vs_master_sell_pct,
      avg_revision_count,
      active_quote_count,
      approved_quote_count,
      rejected_quote_count
    `)
    .limit(1)

  query = applyCommonDevelopmentFilters(query, filters)

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(`Error loading development summary: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    quote_count: toNullableNumber(data.quote_count),
    customer_count: toNullableNumber(data.customer_count),
    model_count: toNullableNumber(data.model_count),
    variante_count: toNullableNumber(data.variante_count),
    season_count: toNullableNumber(data.season_count),
    avg_quote_buy_price: toNullableNumber(data.avg_quote_buy_price),
    avg_quote_sell_price: toNullableNumber(data.avg_quote_sell_price),
    avg_quote_margin_pct: toNullableNumber(data.avg_quote_margin_pct),
    avg_quote_margin_amount: toNullableNumber(data.avg_quote_margin_amount),
    avg_gap_vs_master_buy: toNullableNumber(data.avg_gap_vs_master_buy),
    avg_gap_vs_master_sell: toNullableNumber(data.avg_gap_vs_master_sell),
    avg_gap_vs_master_sell_pct: toNullableNumber(data.avg_gap_vs_master_sell_pct),
    avg_revision_count: toNullableNumber(data.avg_revision_count),
    active_quote_count: toNullableNumber(data.active_quote_count),
    approved_quote_count: toNullableNumber(data.approved_quote_count),
    rejected_quote_count: toNullableNumber(data.rejected_quote_count),
  }
}

export async function getDevelopmentCustomerRanking(
  filters: DevelopmentFilters
): Promise<DevelopmentCustomerRankingItem[]> {
  const supabase = await createClient()

  const sort = filters.sort ?? 'rank_negotiation.asc'

  let query = supabase
    .from('vw_dev_exec_customer_ranking')
    .select(`
      customer,
      season,
      quote_count,
      matched_order_count,
      approx_conversion_rate_pct,
      avg_days_quote_to_order,
      avg_gap_order_vs_quote_sell_pct,
      avg_revision_count,
      rank_conversion,
      rank_negotiation,
      rank_price_compression
    `)

  query = applyCommonDevelopmentFilters(query, filters)

  switch (sort) {
    case 'quote_count.desc':
      query = query.order('quote_count', { ascending: false, nullsFirst: false })
      break
    case 'approx_conversion_rate_pct.desc':
      query = query.order('approx_conversion_rate_pct', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'rank_conversion.asc':
      query = query.order('rank_conversion', { ascending: true, nullsFirst: false })
      break
    case 'rank_price_compression.asc':
      query = query.order('rank_price_compression', {
        ascending: true,
        nullsFirst: false,
      })
      break
    case 'rank_negotiation.asc':
    default:
      query = query.order('rank_negotiation', { ascending: true, nullsFirst: false })
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error loading development customer ranking: ${error.message}`)
  }

  return (data ?? []).map((row): DevelopmentCustomerRankingItem => ({
    customer: toNullableString(row.customer),
    season: toNullableString(row.season),
    quote_count: toNullableNumber(row.quote_count),
    matched_order_count: toNullableNumber(row.matched_order_count),
    approx_conversion_rate_pct: toNullableNumber(row.approx_conversion_rate_pct),
    avg_days_quote_to_order: toNullableNumber(row.avg_days_quote_to_order),
    avg_gap_order_vs_quote_sell_pct: toNullableNumber(
      row.avg_gap_order_vs_quote_sell_pct
    ),
    avg_revision_count: toNullableNumber(row.avg_revision_count),
    rank_conversion: toNullableNumber(row.rank_conversion),
    rank_negotiation: toNullableNumber(row.rank_negotiation),
    rank_price_compression: toNullableNumber(row.rank_price_compression),
  }))
}

export async function getDevelopmentConversionByCustomer(
  filters: DevelopmentFilters
): Promise<DevelopmentConversionByCustomerItem[]> {
  const supabase = await createClient()

  const sort = filters.sort ?? 'approx_conversion_rate_pct.desc'

  let query = supabase
    .from('vw_dev_conversion_by_customer')
    .select(`
      customer,
      season,
      quote_count,
      matched_order_count,
      approx_conversion_rate_pct,
      avg_days_quote_to_order,
      avg_gap_order_vs_quote_sell_pct,
      avg_revision_count
    `)

  query = applyCommonDevelopmentFilters(query, filters)

  switch (sort) {
    case 'quote_count.desc':
      query = query.order('quote_count', { ascending: false, nullsFirst: false })
      break
    case 'matched_order_count.desc':
      query = query.order('matched_order_count', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'avg_revision_count.desc':
      query = query.order('avg_revision_count', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'approx_conversion_rate_pct.desc':
    default:
      query = query.order('approx_conversion_rate_pct', {
        ascending: false,
        nullsFirst: false,
      })
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error loading development conversion by customer: ${error.message}`)
  }

  return (data ?? []).map((row): DevelopmentConversionByCustomerItem => ({
    customer: toNullableString(row.customer),
    season: toNullableString(row.season),
    quote_count: toNullableNumber(row.quote_count),
    matched_order_count: toNullableNumber(row.matched_order_count),
    approx_conversion_rate_pct: toNullableNumber(row.approx_conversion_rate_pct),
    avg_days_quote_to_order: toNullableNumber(row.avg_days_quote_to_order),
    avg_gap_order_vs_quote_sell_pct: toNullableNumber(
      row.avg_gap_order_vs_quote_sell_pct
    ),
    avg_revision_count: toNullableNumber(row.avg_revision_count),
  }))
}

export async function getDevelopmentCustomerPressure(
  filters: DevelopmentFilters
): Promise<DevelopmentCustomerPressureItem[]> {
  const supabase = await createClient()

  const sort = filters.sort ?? 'avg_gap_vs_master_sell_pct.desc'

  let query = supabase
    .from('vw_dev_customer_price_pressure')
    .select(`
      customer,
      season,
      quote_count,
      avg_gap_vs_master_sell_pct,
      avg_quote_margin_pct,
      avg_revision_count,
      avg_gap_order_vs_quote_sell_pct,
      pressure_level
    `)

  query = applyCommonDevelopmentFilters(query, filters)

  switch (sort) {
    case 'avg_quote_margin_pct.desc':
      query = query.order('avg_quote_margin_pct', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'avg_revision_count.desc':
      query = query.order('avg_revision_count', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'quote_count.desc':
      query = query.order('quote_count', { ascending: false, nullsFirst: false })
      break
    case 'avg_gap_vs_master_sell_pct.desc':
    default:
      query = query.order('avg_gap_vs_master_sell_pct', {
        ascending: false,
        nullsFirst: false,
      })
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error loading development customer pressure: ${error.message}`)
  }

  return (data ?? []).map((row): DevelopmentCustomerPressureItem => ({
    customer: toNullableString(row.customer),
    season: toNullableString(row.season),
    quote_count: toNullableNumber(row.quote_count),
    avg_gap_vs_master_sell_pct: toNullableNumber(row.avg_gap_vs_master_sell_pct),
    avg_quote_margin_pct: toNullableNumber(row.avg_quote_margin_pct),
    avg_revision_count: toNullableNumber(row.avg_revision_count),
    avg_gap_order_vs_quote_sell_pct: toNullableNumber(
      row.avg_gap_order_vs_quote_sell_pct
    ),
    pressure_level: toNullableString(row.pressure_level),
  }))
}

export async function getDevelopmentNegotiationScores(
  filters: DevelopmentFilters
): Promise<DevelopmentNegotiationScoreItem[]> {
  const supabase = await createClient()

  const sort = filters.sort ?? 'negotiation_score.desc'

  let query = supabase
    .from('vw_dev_customer_negotiation_score')
    .select(`
      customer,
      season,
      quote_count,
      avg_gap_vs_master,
      avg_gap_quote_to_order,
      avg_revisions,
      avg_days_to_order,
      negotiation_score,
      negotiation_profile
    `)

  query = applyCommonDevelopmentFilters(query, filters)

  switch (sort) {
    case 'avg_gap_vs_master.desc':
      query = query.order('avg_gap_vs_master', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'avg_revisions.desc':
      query = query.order('avg_revisions', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'quote_count.desc':
      query = query.order('quote_count', { ascending: false, nullsFirst: false })
      break
    case 'negotiation_score.desc':
    default:
      query = query.order('negotiation_score', {
        ascending: false,
        nullsFirst: false,
      })
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error loading development negotiation scores: ${error.message}`)
  }

  return (data ?? []).map((row): DevelopmentNegotiationScoreItem => ({
    customer: toNullableString(row.customer),
    season: toNullableString(row.season),
    quote_count: toNullableNumber(row.quote_count),
    avg_gap_vs_master: toNullableNumber(row.avg_gap_vs_master),
    avg_gap_quote_to_order: toNullableNumber(row.avg_gap_quote_to_order),
    avg_revisions: toNullableNumber(row.avg_revisions),
    avg_days_to_order: toNullableNumber(row.avg_days_to_order),
    negotiation_score: toNullableNumber(row.negotiation_score),
    negotiation_profile:
      row.negotiation_profile === 'AGGRESSIVE' ||
      row.negotiation_profile === 'NORMAL' ||
      row.negotiation_profile === 'EASY'
        ? row.negotiation_profile
        : null,
  }))
}

export async function getDevelopmentQuoteVsOrder(
  filters: DevelopmentFilters
): Promise<DevelopmentQuoteVsOrderItem[]> {
  const supabase = await createClient()

  const sort = filters.sort ?? 'quote_date.desc'

  let query = supabase
    .from('vw_dev_quote_vs_order')
    .select(`
      cotizacion_id,
      quote_created_at,
      quote_date,
      customer,
      season,
      style,
      reference,
      color,
      quote_factory,
      quote_status,
      revision_no_inferred,
      revision_count_inferred,
      quote_buy_price,
      quote_sell_price,
      quote_margin_pct,
      quote_margin_amount,
      linea_pedido_id,
      po_id,
      po_number,
      order_factory,
      order_season,
      po_date,
      operativa_code,
      order_buy_price,
      order_sell_price,
      gap_order_vs_quote_buy,
      gap_order_vs_quote_sell,
      gap_order_vs_quote_sell_pct,
      days_quote_to_order
    `)

  query = applyQuoteFilters(query, filters)

  switch (sort) {
    case 'quote_date.asc':
      query = query.order('quote_date', { ascending: true, nullsFirst: false })
      break
    case 'customer.asc':
      query = query.order('customer', { ascending: true, nullsFirst: false })
      break
    case 'season.asc':
      query = query.order('season', { ascending: true, nullsFirst: false })
      break
    case 'quote_status.asc':
      query = query.order('quote_status', { ascending: true, nullsFirst: false })
      break
    case 'days_quote_to_order.desc':
      query = query.order('days_quote_to_order', {
        ascending: false,
        nullsFirst: false,
      })
      break
    case 'quote_date.desc':
    default:
      query = query.order('quote_date', { ascending: false, nullsFirst: false })
      break
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error loading development quotes vs order: ${error.message}`)
  }

  return (data ?? []).map((row): DevelopmentQuoteVsOrderItem => ({
    cotizacion_id: toNullableString(row.cotizacion_id),
    quote_created_at: toNullableString(row.quote_created_at),
    quote_date: toNullableString(row.quote_date),
    customer: toNullableString(row.customer),
    season: toNullableString(row.season),
    style: toNullableString(row.style),
    reference: toNullableString(row.reference),
    color: toNullableString(row.color),
    quote_factory: toNullableString(row.quote_factory),
    quote_status: toNullableString(row.quote_status),
    revision_no_inferred: toNullableNumber(row.revision_no_inferred),
    revision_count_inferred: toNullableNumber(row.revision_count_inferred),
    quote_buy_price: toNullableNumber(row.quote_buy_price),
    quote_sell_price: toNullableNumber(row.quote_sell_price),
    quote_margin_pct: toNullableNumber(row.quote_margin_pct),
    quote_margin_amount: toNullableNumber(row.quote_margin_amount),
    linea_pedido_id: toNullableString(row.linea_pedido_id),
    po_id: toNullableString(row.po_id),
    po_number: toNullableString(row.po_number),
    order_factory: toNullableString(row.order_factory),
    order_season: toNullableString(row.order_season),
    po_date: toNullableString(row.po_date),
    operativa_code: toNullableString(row.operativa_code),
    order_buy_price: toNullableNumber(row.order_buy_price),
    order_sell_price: toNullableNumber(row.order_sell_price),
    gap_order_vs_quote_buy: toNullableNumber(row.gap_order_vs_quote_buy),
    gap_order_vs_quote_sell: toNullableNumber(row.gap_order_vs_quote_sell),
    gap_order_vs_quote_sell_pct: toNullableNumber(row.gap_order_vs_quote_sell_pct),
    days_quote_to_order: toNullableNumber(row.days_quote_to_order),
  }))
}

export async function getDevelopmentFilterOptions(): Promise<DevelopmentFilterOptions> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vw_dev_quote_vs_order')
    .select('customer, season, quote_status')

  if (error) {
    throw new Error(`Error loading development filter options: ${error.message}`)
  }

  const customersSet = new Set<string>()
  const seasonsSet = new Set<string>()
  const quoteStatusesSet = new Set<string>()

  for (const row of data ?? []) {
    const customer = toNullableString(row.customer)
    const season = toNullableString(row.season)
    const quoteStatus = toNullableString(row.quote_status)

    if (customer) customersSet.add(customer)
    if (season) seasonsSet.add(season)
    if (quoteStatus) quoteStatusesSet.add(quoteStatus)
  }

  return {
    customers: Array.from(customersSet)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
    seasons: Array.from(seasonsSet)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
    quoteStatuses: Array.from(quoteStatusesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value })),
  }
}