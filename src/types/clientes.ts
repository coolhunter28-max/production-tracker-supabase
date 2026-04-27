export type CustomerBusinessProfile =
  | "STRATEGIC"
  | "PROFITABLE"
  | "NEGOTIATOR"
  | "RISKY"
  | "LOW_VALUE";

export type CustomerBusinessMatrixSort =
  | "business_score.desc"
  | "business_score.asc"
  | "friction_score.desc"
  | "friction_score.asc"
  | "customer.asc"
  | "customer.desc";

export interface CustomerBusinessMatrixRow {
  customer: string;
  customer_business_profile: CustomerBusinessProfile | string | null;
  customer_business_score: number | null;
  customer_friction_score: number | null;
}

export interface CustomerBusinessMatrixFilters {
  customer: string;
  profile: string;
  sort: CustomerBusinessMatrixSort;
}

export interface CustomerBusinessKPISet {
  totalCustomers: number;
  strategicCustomers: number;
  profitableCustomers: number;
  riskyCustomers: number;
  avgBusinessScore: number;
  avgFrictionScore: number;
}

export interface CustomerBusinessFilterOptions {
  customers: string[];
  profiles: CustomerBusinessProfile[];
}

export interface CustomerBusinessDetail {
  customer: string;
  customer_business_profile: CustomerBusinessProfile | string | null;
  customer_business_score: number | null;
  customer_friction_score: number | null;
}

export interface CustomerOperationalDetail {
  customer: string;
  po_count?: number | null;
  qty_total?: number | null;
  contribution_total?: number | null;
  contribution_pct?: number | null;
  avg_delay_production_days?: number | null;
}

export interface CustomerDevelopmentDetail {
  customer: string;
  season?: string | null;
  quote_count?: number | null;
  avg_gap_vs_master?: number | null;
  avg_gap_quote_to_order?: number | null;
  avg_revisions?: number | null;
  avg_days_to_order?: number | null;
  negotiation_score?: number | null;
  negotiation_profile?: string | null;
}

export interface CustomerQualityDetail {
  customer: string;
  inspections_total?: number | null;
  fail_rate?: number | null;
  defect_rate?: number | null;
}

export interface CustomerDetailBundle {
  business: CustomerBusinessDetail | null;
  operations: CustomerOperationalDetail | null;
  development: CustomerDevelopmentDetail | null;
  quality: CustomerQualityDetail | null;
  xiamenVolumeEvolution: CustomerXiamenVolumeEvolutionRow[];
}
export interface CustomerXiamenVolumeEvolutionRow {
  customer: string;
  season: string;
  previous_season: string | null;

  qty_current: number | null;
  qty_previous: number | null;

  sell_current: number | null;
  sell_previous: number | null;

  po_count_current: number | null;
  po_count_previous: number | null;

  line_count_current: number | null;
  line_count_previous: number | null;

  qty_growth_pct: number | null;
  sell_growth_pct: number | null;
  po_count_growth_pct: number | null;

  volume_signal:
    | "NO_BASELINE"
    | "VOLUME_DROP_RISK"
    | "VOLUME_SOFT_DROP"
    | "STABLE"
    | "GROWING"
    | "UNKNOWN"
    | string
    | null;
}
export interface CustomerLatestXiamenVolumeSignal {
  customer: string;
  season: string;
  previous_season: string | null;
  qty_growth_pct: number | null;
  sell_growth_pct: number | null;
  volume_signal: string | null;
}