import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";

export type ExecutiveActionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING"
  | "RESOLVED"
  | "DISMISSED";

export type ExecutiveActionPriority =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type ExecutiveActionQueueRow = {
  id: string;
  action_key: string;
  source_view: string;
  source_type: string;
  source_entity_type: string;
  source_entity_id: string;
  customer: string | null;
  factory: string | null;
  season: string | null;
  module: string | null;
  priority: ExecutiveActionPriority;
  priority_rank: number;
  status: ExecutiveActionStatus;
  status_rank: number;
  title: string;
  description: string | null;
  recommended_action: string | null;
  owner_user_id: string | null;
  owner_label: string | null;
  first_detected_at: string;
  last_seen_at: string;
  due_date: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  notes_count: number;
  decisions_count: number;
};

export type ExecutiveActionLifecycleRow = {
  id: string;
  priority: ExecutiveActionPriority;
  status: ExecutiveActionStatus;
  sla_bucket: string;
  age_days: number;
  days_since_update: number;
  without_owner_flag: boolean;
  stale_critical_flag: boolean;
  stale_action_flag: boolean;
  escalation_flag: boolean;
  lifecycle_priority_rank: number;
};

export type ExecutiveActionNote = {
  id: string;
  action_id: string;
  note: string;
  created_by: string | null;
  created_by_label: string | null;
  created_at: string;
};

export type ExecutiveActionDecision = {
  id: string;
  action_id: string;
  decision: string;
  decision_reason: string | null;
  decision_by: string | null;
  decision_by_label: string | null;
  created_at: string;
};

export type ExecutiveActionsFilters = {
  status?: ExecutiveActionStatus | "ALL";
  priority?: ExecutiveActionPriority | "ALL";
  customer?: string;
  owner?: string;
};

export function parseExecutiveActionsSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): ExecutiveActionsFilters {
  const getValue = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    status: (getValue("status") as ExecutiveActionsFilters["status"]) || "ALL",
    priority:
      (getValue("priority") as ExecutiveActionsFilters["priority"]) || "ALL",
    customer: getValue("customer") || undefined,
    owner: getValue("owner") || undefined,
  };
}

export async function getExecutiveActionQueue(
  filters: ExecutiveActionsFilters = {}
): Promise<ExecutiveActionQueueRow[]> {
  const supabase = await createClient();

  let query = supabase.from("vw_exec_action_queue_v1").select("*");

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters.priority && filters.priority !== "ALL") {
    query = query.eq("priority", filters.priority);
  }

  if (filters.customer) {
    query = query.eq("customer", filters.customer);
  }

  if (filters.owner) {
    query = query.eq("owner_label", filters.owner);
  }

  const { data, error } = await query
    .order("status_rank", { ascending: true })
    .order("priority_rank", { ascending: true })
    .order("last_seen_at", { ascending: false });

  if (error) {
    console.error("getExecutiveActionQueue error:", error);
    return [];
  }

  return (data || []) as ExecutiveActionQueueRow[];
}

export async function getExecutiveActionLifecycle(): Promise<
  ExecutiveActionLifecycleRow[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_exec_action_lifecycle_v1")
    .select("*")
    .order("lifecycle_priority_rank", { ascending: true });

  if (error) {
    console.error("getExecutiveActionLifecycle error:", error);
    return [];
  }

  return (data || []) as ExecutiveActionLifecycleRow[];
}

export async function getExecutiveActionById(
  id: string
): Promise<ExecutiveActionQueueRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_exec_action_queue_v1")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getExecutiveActionById error:", error);
    return null;
  }

  return data as ExecutiveActionQueueRow;
}

export async function getExecutiveActionNotes(
  actionId: string
): Promise<ExecutiveActionNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("executive_action_notes")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getExecutiveActionNotes error:", error);
    return [];
  }

  return (data || []) as ExecutiveActionNote[];
}

export async function getExecutiveActionDecisions(
  actionId: string
): Promise<ExecutiveActionDecision[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("executive_action_decisions")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getExecutiveActionDecisions error:", error);
    return [];
  }

  return (data || []) as ExecutiveActionDecision[];
}

export async function updateExecutiveActionStatus(params: {
  id: string;
  status: ExecutiveActionStatus;
  resolutionNote?: string;
}) {
  const supabase = await createClient();

  const payload: {
    status: ExecutiveActionStatus;
    resolution_note?: string | null;
  } = {
    status: params.status,
  };

  if (params.resolutionNote !== undefined) {
    payload.resolution_note = params.resolutionNote || null;
  }

  const { error } = await supabase
    .from("executive_actions")
    .update(payload)
    .eq("id", params.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/analytics/executive");
  revalidatePath(`/analytics/executive/actions/${params.id}`);
}

export async function assignExecutiveActionOwner(params: {
  id: string;
  ownerLabel: string | null;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("executive_actions")
    .update({
      owner_label: params.ownerLabel,
    })
    .eq("id", params.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/analytics/executive");
  revalidatePath(`/analytics/executive/actions/${params.id}`);
}

export async function addExecutiveActionNote(params: {
  actionId: string;
  note: string;
  createdByLabel?: string;
}) {
  const supabase = await createClient();

  const note = params.note.trim();

  if (!note) {
    throw new Error("La nota no puede estar vacía.");
  }

  const { error } = await supabase
    .from("executive_action_notes")
    .insert({
      action_id: params.actionId,
      note,
      created_by_label: params.createdByLabel || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/analytics/executive");
  revalidatePath(`/analytics/executive/actions/${params.actionId}`);
}

export async function addExecutiveActionDecision(params: {
  actionId: string;
  decision: string;
  decisionReason?: string;
  decisionByLabel?: string;
}) {
  const supabase = await createClient();

  const decision = params.decision.trim();

  if (!decision) {
    throw new Error("La decisión no puede estar vacía.");
  }

  const { error } = await supabase
    .from("executive_action_decisions")
    .insert({
      action_id: params.actionId,
      decision,
      decision_reason: params.decisionReason || null,
      decision_by_label: params.decisionByLabel || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/analytics/executive");
  revalidatePath(`/analytics/executive/actions/${params.actionId}`);
}

export function buildExecutiveActionKPIs(
  actions: ExecutiveActionQueueRow[]
) {
  return {
    total: actions.length,
    open: actions.filter((item) => item.status === "OPEN").length,
    inProgress: actions.filter((item) => item.status === "IN_PROGRESS").length,
    waiting: actions.filter((item) => item.status === "WAITING").length,
    critical: actions.filter((item) => item.priority === "CRITICAL").length,
    resolved: actions.filter((item) => item.status === "RESOLVED").length,
  };
}

export function buildExecutiveWorkflowKPIs(
  lifecycle: ExecutiveActionLifecycleRow[]
) {
  const criticalAging = lifecycle.filter((item) => item.stale_critical_flag).length;
  const withoutOwner = lifecycle.filter((item) => item.without_owner_flag).length;
  const escalations = lifecycle.filter((item) => item.escalation_flag).length;
  const stale = lifecycle.filter((item) => item.stale_action_flag).length;

  const open = lifecycle.filter(
    (item) =>
      item.status === "OPEN" ||
      item.status === "IN_PROGRESS" ||
      item.status === "WAITING"
  ).length;

  let workflowHealth: "GOOD" | "WARNING" | "CRITICAL" = "GOOD";

  if (criticalAging > 0 || escalations > 0) {
    workflowHealth = "CRITICAL";
  } else if (withoutOwner > 0 || stale > 0) {
    workflowHealth = "WARNING";
  }

  return {
    criticalAging,
    withoutOwner,
    escalations,
    stale,
    open,
    workflowHealth,
  };
}