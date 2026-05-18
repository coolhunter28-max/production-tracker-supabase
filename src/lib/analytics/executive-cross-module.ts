import { createClient } from "@/lib/supabase";

export type CrossModuleRiskLevel =
  | "CRITICAL"
  | "WARNING"
  | "MONITOR"
  | "HEALTHY";

export type CrossModulePrimaryDriver =
  | "COMMERCIAL"
  | "PRODUCTION"
  | "MARGIN"
  | "DEVELOPMENT"
  | "CONCENTRATION"
  | "NONE";

export type ExecutiveCrossModuleRiskRow = {
  customer: string;
  cross_module_risk_score: number | null;
  cross_module_risk_level: CrossModuleRiskLevel;
  primary_driver: CrossModulePrimaryDriver;
  executive_summary: string | null;
  recommended_cross_module_action: string | null;

  alert_level: string | null;
  alert_type: string | null;
  alert_reason: string | null;
  recommended_action: string | null;

  commercial_risk_points: number | null;
  production_risk_points: number | null;
  margin_risk_points: number | null;
  development_risk_points: number | null;
  concentration_risk_points: number | null;

  contextual_business_profile: string | null;
  contextual_business_score: number | null;
  customer_friction_score: number | null;
  health_signal: string | null;
  volume_signal: string | null;
  qty_growth_pct: number | null;
  sell_growth_pct: number | null;
  score_model: string | null;

  po_count: number | null;
  line_count: number | null;
  factory_count: number | null;
  model_count: number | null;
  qty_total: number | null;
  sell_amount_total: number | null;
  contribution_total: number | null;
  contribution_pct: number | null;
  production_late_rate_pct: number | null;
  avg_delay_production_days: number | null;
  max_delay_production_days: number | null;
  executive_tier: string | null;

  negotiation_score: number | null;
  negotiation_profile: string | null;
  avg_revisions: number | null;
  avg_days_to_order: number | null;
};

export async function getExecutiveCrossModuleRisk(): Promise<
  ExecutiveCrossModuleRiskRow[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_exec_cross_module_risk_v3")
    .select("*")
    .in("cross_module_risk_level", ["CRITICAL", "WARNING", "MONITOR"])
    .order("cross_module_risk_score", { ascending: false });

  if (error) {
    console.error("vw_exec_cross_module_risk_v3 error:", error);
    return [];
  }

  return (data ?? []) as ExecutiveCrossModuleRiskRow[];
}

export function buildExecutiveCrossModuleKPIs(
  rows: ExecutiveCrossModuleRiskRow[]
) {
  return {
    total: rows.length,
    critical: rows.filter((row) => row.cross_module_risk_level === "CRITICAL")
      .length,
    warning: rows.filter((row) => row.cross_module_risk_level === "WARNING")
      .length,
    monitor: rows.filter((row) => row.cross_module_risk_level === "MONITOR")
      .length,
  };
}