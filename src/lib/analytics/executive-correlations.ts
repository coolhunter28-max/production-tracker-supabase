export type ExecutiveCorrelationSignal = {
    customer: string;
    correlation_type: string;
    severity: string;
    correlation_reason: string;
    correlation_score: number;
  };
  
  export async function getExecutiveCorrelationSignals() {
    const { createClient } = await import("@/lib/supabase");
  
    const supabase = await createClient();
  
    const { data, error } = await supabase
      .from("vw_exec_cross_module_correlations_v1")
      .select("*")
      .order("correlation_score", { ascending: false });
  
    if (error) {
      console.error(
        "[getExecutiveCorrelationSignals]",
        error.message
      );
  
      return [];
    }
  
    return (data ?? []) as ExecutiveCorrelationSignal[];
  }
  
  export function buildExecutiveCorrelationKPIs(
    rows: ExecutiveCorrelationSignal[]
  ) {
    return {
      total: rows.length,
      critical: rows.filter((r) => r.severity === "CRITICAL").length,
      warning: rows.filter((r) => r.severity === "WARNING").length,
      monitor: rows.filter((r) => r.severity === "MONITOR").length,
    };
  }