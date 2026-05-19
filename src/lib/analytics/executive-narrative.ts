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
  generated_at: string;
  critical_open: number;
  without_owner: number;
  stale_critical: number;
  escalations: number;
  critical_customers: number;
  warning_customers: number;
  top_customer: string | null;
  top_customer_risk_level: string | null;
  top_customer_risk_score: number | null;
  top_customer_summary: string | null;
  executive_health: "CRITICAL" | "WARNING" | "HEALTHY";
  executive_headline: string;
  executive_focus: string;
};

function buildCustomerHref(customer: string | null) {
  if (!customer) return null;

  return `/analytics/clientes/${encodeURIComponent(customer)}`;
}

function toSeverity(
  value: MorningBriefRow["executive_health"]
): ExecutiveNarrativeSeverity {
  if (value === "CRITICAL") return "CRITICAL";
  if (value === "WARNING") return "WARNING";
  if (value === "HEALTHY") return "HEALTHY";

  return "INFO";
}

export async function getExecutiveNarrative(
  _filters: ExecutiveNarrativeFilters = {}
): Promise<ExecutiveNarrativeRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("vw_exec_morning_brief_v1")
    .select("*")
    .single();

  if (error) {
    console.error("getExecutiveNarrative error:", error);

    return [
      {
        id: "narrative-unavailable",
        section: "Executive Brief",
        title: "Narrativa ejecutiva no disponible",
        summary:
          "No se ha podido leer vw_exec_morning_brief_v1. Revisa la view en Supabase.",
        severity: "WARNING",
        primary_label: "Status",
        primary_value: "Unavailable",
        secondary_label: null,
        secondary_value: null,
        action_label: null,
        href: null,
        sort_order: 1,
      },
    ];
  }

  const brief = data as MorningBriefRow;

  return [
    {
      id: "morning-brief-health",
      section: "Executive Morning Brief",
      title: brief.executive_headline,
      summary: brief.executive_focus,
      severity: toSeverity(brief.executive_health),
      primary_label: "Executive Health",
      primary_value: brief.executive_health,
      secondary_label: "Open critical actions",
      secondary_value: brief.critical_open,
      action_label: "Ver acciones",
      href: "/analytics/executive",
      sort_order: 1,
    },
    {
      id: "morning-brief-workflow",
      section: "Workflow Intelligence",
      title:
        brief.without_owner > 0
          ? `${brief.without_owner} acciones sin owner asignado`
          : "Todas las acciones tienen owner asignado",
      summary:
        brief.stale_critical > 0 || brief.escalations > 0
          ? "Existen señales de gestión que requieren atención ejecutiva."
          : "No hay acciones stale ni escalaciones pendientes.",
      severity:
        brief.stale_critical > 0 || brief.escalations > 0
          ? "CRITICAL"
          : brief.without_owner > 0
            ? "WARNING"
            : "HEALTHY",
      primary_label: "Without owner",
      primary_value: brief.without_owner,
      secondary_label: "Escalations",
      secondary_value: brief.escalations,
      action_label: "Revisar workflow",
      href: "/analytics/executive",
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
      severity:
        brief.top_customer_risk_level === "CRITICAL"
          ? "CRITICAL"
          : brief.top_customer_risk_level === "WARNING"
            ? "WARNING"
            : "INFO",
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