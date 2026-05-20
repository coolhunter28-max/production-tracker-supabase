import { createClient } from "@/lib/supabase";

export type ExecutiveDailyBrief = {
  critical_count: number;
  warning_count: number;
  production_risk_count: number;
  quality_risk_count: number;
  development_risk_count: number;
  open_actions_count: number;
  resolved_today_count: number;
};

export async function getExecutiveDailyBrief(): Promise<ExecutiveDailyBrief | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vw_exec_daily_brief_v1")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[getExecutiveDailyBrief]", error);
    return null;
  }

  return data as ExecutiveDailyBrief | null;
}