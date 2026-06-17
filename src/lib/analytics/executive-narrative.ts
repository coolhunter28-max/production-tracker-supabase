import "server-only";

import { createClient } from "@/lib/supabase";

export type ExecutiveNarrativeFilters = {
  season?: string | null;
  customer?: string | null;
  factory?: string | null;
};

export type ExecutiveNarrativeSeverity =
  | "CRITICAL"
  | "WARNING"
  | "HEALTHY"
  | "INFO";

export type ExecutiveNarrativeRow = {
  id: string;
  section: string;
  title: string;
  summary: string;
  severity: ExecutiveNarrativeSeverity;
  primary_label: string;
  primary_value: string | number | null;
  secondary_label: string | null;
  secondary_value: string | number | null;
  action_label: string | null;
  href: string | null;
  sort_order: number;
};

type MorningBriefRow = {
  critical_open: number | null;
  no_followup_actions: number | null;
  workflow_resolution_score: number | null;
  workflow_resolution_health:
    | "CRITICAL"
    | "WARNING"
    | "ACTIVE"
    | "HEALTHY"
    | null;

  top_customer: string | null;
  top_customer_risk_level: string | null;
  top_customer_risk_score: number | null;
  top_customer_summary: string | null;

  executive_health: "CRITICAL" | "WARNING" | "HEALTHY" | null;
  executive_headline: string | null;
  executive_focus: string | null;
  resolution_summary: string | null;
};

function buildCustomerHref(customer: string | null) {
  return customer ? `/analytics/clientes/${encodeURIComponent(customer)}` : null;
}

function toSeverity(value: string | null): ExecutiveNarrativeSeverity {
  if (value === "CRITICAL") return "CRITICAL";
  if (value === "WARNING") return "WARNING";
  if (value === "HEALTHY" || value === "ACTIVE") return "HEALTHY";
  return "INFO";
}

export async function getExecutiveNarrative(
  _filters: ExecutiveNarrativeFilters = {}
): Promise<ExecutiveNarrativeRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mv_exec_morning_brief_fast")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getExecutiveNarrative] error:", error);
    throw new Error(`Error loading Executive Narrative: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  const brief = data as MorningBriefRow;

  return [
    {
      id: "morning-brief-health",
      section: "Executive Morning Brief",
      title: brief.executive_headline || "Resumen ejecutivo no disponible",
      summary: [brief.executive_focus, brief.resolution_summary]
        .filter(Boolean)
        .join(" "),
      severity: toSeverity(brief.executive_health),
      primary_label: "Executive Health",
      primary_value: brief.executive_health,
      secondary_label: "Open critical actions",
      secondary_value: brief.critical_open,
      action_label: "Ver acciones",
      href: "#executive-action-queue",
      sort_order: 1,
    },
    {
      id: "morning-brief-workflow",
      section: "Resolution Intelligence",
      title:
        (brief.no_followup_actions ?? 0) > 0
          ? `${brief.no_followup_actions} acciones sin seguimiento registrado`
          : "Seguimiento ejecutivo actualizado",
      summary:
        brief.resolution_summary ||
        "La salud de resolución todavía no tiene datos suficientes.",
      severity: toSeverity(brief.workflow_resolution_health),
      primary_label: "Resolution Score",
      primary_value: brief.workflow_resolution_score,
      secondary_label: "No follow-up",
      secondary_value: brief.no_followup_actions,
      action_label: "Revisar workflow",
      href: "#executive-action-queue",
      sort_order: 2,
    },
    {
      id: "morning-brief-top-risk",
      section: "Top Executive Focus",
      title: brief.top_customer
        ? `${brief.top_customer} es el principal foco ejecutivo`
        : "Sin foco prioritario detectado",
      summary:
        brief.top_customer_summary ||
        "No hay clientes con riesgo transversal prioritario.",
      severity: toSeverity(brief.top_customer_risk_level),
      primary_label: "Risk score",
      primary_value: brief.top_customer_risk_score,
      secondary_label: "Risk level",
      secondary_value: brief.top_customer_risk_level,
      action_label: brief.top_customer ? "Ver cliente" : null,
      href: buildCustomerHref(brief.top_customer),
      sort_order: 3,
    },
  ];
}