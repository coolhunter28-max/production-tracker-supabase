import { createClient } from "@/lib/supabase";

export type ExecutiveDailyBrief = {
  critical_count: number | null;
  warning_count: number | null;
  production_risk_count: number | null;
  quality_risk_count: number | null;
  development_risk_count: number | null;
  open_actions_count: number | null;
  resolved_today_count: number | null;
  critical_open: number | null;
  critical_customers: number | null;
  warning_customers: number | null;
  total_actions: number | null;
  executive_headline: string | null;
  executive_focus: string | null;
};

export async function getExecutiveDailyBrief(): Promise<ExecutiveDailyBrief | null> {
  const supabase = await createClient();

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