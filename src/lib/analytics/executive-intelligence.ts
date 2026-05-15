import { createClient } from "@/lib/supabase";

export type ExecAlertLevel =
  | "CRITICAL"
  | "WARNING"
  | "MONITOR"
  | "HEALTHY"
  | "NEUTRAL";

export type ExecSourceModule = "CUSTOMER" | "COMMERCIAL";

export type ExecutiveIntelligenceFilters = {
  season?: string | null;
  customer?: string | null;
  factory?: string | null;
  alertLevel?: string | null;
  sourceModule?: string | null;
};

export type ExecutiveIntelligenceSignal = {
  customer: string;
  alert_level: ExecAlertLevel;
  alert_type: string;
  alert_reason: string | null;
  recommended_action: string | null;
  alert_priority: number | null;
  contextual_business_profile: string | null;
  contextual_business_score: number | null;
  customer_friction_score: number | null;
  health_signal: string | null;
  health_reason: string | null;
  volume_signal: string | null;
  qty_growth_pct: number | null;
  sell_growth_pct: number | null;
  xiamen_context_flag: boolean | null;
  customer_size_band: string | null;
  profitability_band: string | null;
  contribution_pct: number | null;
  xiamen_sales_mix_pct: number | null;
  bsg_sales_mix_pct: number | null;
  score_model: string | null;
  health_priority: number | null;
  source_module: ExecSourceModule;
};

export async function getExecutiveIntelligenceFocus(
  filters: ExecutiveIntelligenceFilters
): Promise<ExecutiveIntelligenceSignal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_exec_intelligence_focus_v1", {
    p_season: null,
    p_customer: filters.customer ?? null,
    p_factory: filters.factory ?? null,
    p_alert_level: filters.alertLevel ?? null,
    p_source_module: filters.sourceModule ?? null,
  });

  if (error) {
    console.error("get_exec_intelligence_focus_v1 error:", error);
    return [];
  }

  return (data ?? []) as ExecutiveIntelligenceSignal[];
}

export function buildExecutiveIntelligenceKPIs(
  rows: ExecutiveIntelligenceSignal[]
) {
  return {
    total: rows.length,
    critical: rows.filter((row) => row.alert_level === "CRITICAL").length,
    warning: rows.filter((row) => row.alert_level === "WARNING").length,
    monitor: rows.filter((row) => row.alert_level === "MONITOR").length,
    healthy: rows.filter((row) => row.alert_level === "HEALTHY").length,
  };
}