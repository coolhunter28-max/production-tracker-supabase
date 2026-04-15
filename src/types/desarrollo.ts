export type DevelopmentSummaryItem = {
  quote_count: number | null
  customer_count: number | null
  model_count: number | null
  variante_count: number | null
  season_count: number | null
  avg_quote_buy_price: number | null
  avg_quote_sell_price: number | null
  avg_quote_margin_pct: number | null
  avg_quote_margin_amount: number | null
  avg_gap_vs_master_buy: number | null
  avg_gap_vs_master_sell: number | null
  avg_gap_vs_master_sell_pct: number | null
  avg_revision_count: number | null
  active_quote_count: number | null
  approved_quote_count: number | null
  rejected_quote_count: number | null
}

export type DevelopmentCustomerRankingItem = {
  customer: string | null
  season: string | null
  quote_count: number | null
  matched_order_count: number | null
  approx_conversion_rate_pct: number | null
  avg_days_quote_to_order: number | null
  avg_gap_order_vs_quote_sell_pct: number | null
  avg_revision_count: number | null
  rank_conversion: number | null
  rank_negotiation: number | null
  rank_price_compression: number | null
}

export type DevelopmentConversionByCustomerItem = {
  customer: string | null
  season: string | null
  quote_count: number | null
  matched_order_count: number | null
  approx_conversion_rate_pct: number | null
  avg_days_quote_to_order: number | null
  avg_gap_order_vs_quote_sell_pct: number | null
  avg_revision_count: number | null
}

export type DevelopmentCustomerPressureItem = {
  customer: string | null
  season: string | null
  quote_count: number | null
  avg_gap_vs_master_sell_pct: number | null
  avg_quote_margin_pct: number | null
  avg_revision_count: number | null
  avg_gap_order_vs_quote_sell_pct: number | null
  pressure_level: string | null
}

export type DevelopmentNegotiationScoreItem = {
  customer: string | null
  season: string | null
  quote_count: number | null
  avg_gap_vs_master: number | null
  avg_gap_quote_to_order: number | null
  avg_revisions: number | null
  avg_days_to_order: number | null
  negotiation_score: number | null
  negotiation_profile: 'AGGRESSIVE' | 'NORMAL' | 'EASY' | null
}

export type DevelopmentQuoteVsOrderItem = {
  cotizacion_id: string | null
  quote_created_at: string | null
  quote_date: string | null
  customer: string | null
  season: string | null
  style: string | null
  reference: string | null
  color: string | null
  quote_factory: string | null
  quote_status: string | null
  revision_no_inferred: number | null
  revision_count_inferred: number | null
  quote_buy_price: number | null
  quote_sell_price: number | null
  quote_margin_pct: number | null
  quote_margin_amount: number | null
  linea_pedido_id: string | null
  po_id: string | null
  po_number: string | null
  order_factory: string | null
  order_season: string | null
  po_date: string | null
  operativa_code: string | null
  order_buy_price: number | null
  order_sell_price: number | null
  gap_order_vs_quote_buy: number | null
  gap_order_vs_quote_sell: number | null
  gap_order_vs_quote_sell_pct: number | null
  days_quote_to_order: number | null
}

export type DevelopmentFilters = {
  customer?: string
  season?: string
  quoteStatus?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
  page?: number
}

export type DevelopmentFilterOption = {
  value: string
  label: string
}

export type DevelopmentFilterOptions = {
  customers: DevelopmentFilterOption[]
  seasons: DevelopmentFilterOption[]
  quoteStatuses: DevelopmentFilterOption[]
}