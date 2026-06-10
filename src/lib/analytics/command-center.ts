import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export type CommandCenterAlertLevel = "CRITICAL" | "WARNING" | "MONITOR" | "OK";

export type CommandCenterAlertSummary = {
  operational_group_key: string;
  customer: string;
  season: string;
  supplier: string | null;
  etd_pi: string | null;
  po_id_list: string | null;
  po_list: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qty_total: number | null;
  alert_level: CommandCenterAlertLevel;
  priority: number;
  sort_order: number;
  top_alert_event: string | null;
  top_alert_title: string | null;
  top_alert_message: string | null;
  alert_count: number | null;
};

export type CommandCenterAlertEvent = {
  operational_group_key: string;
  customer: string;
  season: string;
  supplier: string | null;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qty_total: number | null;
  alert_event: string;
  alert_level: CommandCenterAlertLevel;
  priority: number;
  sort_order: number;
  alert_title: string | null;
  alert_message: string | null;
};

export type CommandCenterCustomerGroup = {
  customer: string;
  seasons: string[];
  suppliers: string[];
  fronts_count: number;
  qty_total: number;
  top_alert_level: CommandCenterAlertLevel;
  top_alert_event: string | null;
  top_priority: number;
  top_sort_order: number;
  next_etd: string | null;

  critical_count: number;
  warning_count: number;
  monitor_count: number;

  shipping_overdue_count: number;
  inspection_due_count: number;
  sample_pending_count: number;
  sample_rejected_count: number;
  qc_pending_count: number;
  qc_issues_count: number;
  qc_failed_count: number;
  booking_due_count: number;
  closing_due_count: number;
  trial_pending_count: number;
  etd_soon_count: number;
};

export type CommandCenterStats = {
  customers_with_fronts: number;
  fronts_total: number;
  critical_customers: number;
  warning_customers: number;
  monitor_customers: number;
  shipping_overdue_count: number;
  inspection_due_count: number;
  sample_pending_count: number;
  qc_pending_count: number;
};

export type CommandCenterBundle = {
  customers: CommandCenterCustomerGroup[];
  stats: CommandCenterStats;
  access: {
    email: string | null;
    role: string;
    canSeeAllCustomers: boolean;
    customers: string[];
  };
};

function emptyGroup(customer: string): CommandCenterCustomerGroup {
  return {
    customer,
    seasons: [],
    suppliers: [],
    fronts_count: 0,
    qty_total: 0,
    top_alert_level: "OK",
    top_alert_event: null,
    top_priority: 9,
    top_sort_order: 99,
    next_etd: null,

    critical_count: 0,
    warning_count: 0,
    monitor_count: 0,

    shipping_overdue_count: 0,
    inspection_due_count: 0,
    sample_pending_count: 0,
    sample_rejected_count: 0,
    qc_pending_count: 0,
    qc_issues_count: 0,
    qc_failed_count: 0,
    booking_due_count: 0,
    closing_due_count: 0,
    trial_pending_count: 0,
    etd_soon_count: 0,
  };
}

function emptyStats(): CommandCenterStats {
  return {
    customers_with_fronts: 0,
    fronts_total: 0,
    critical_customers: 0,
    warning_customers: 0,
    monitor_customers: 0,
    shipping_overdue_count: 0,
    inspection_due_count: 0,
    sample_pending_count: 0,
    qc_pending_count: 0,
  };
}

function addUnique(target: string[], value?: string | null) {
  if (value && !target.includes(value)) {
    target.push(value);
  }
}

function isEarlierDate(a?: string | null, b?: string | null) {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() < new Date(b).getTime();
}

function eventCounterKey(event: string) {
  if (event === "SHIPPING_OVERDUE") return "shipping_overdue_count";
  if (event === "INSPECTION_DUE") return "inspection_due_count";
  if (event === "SAMPLE_PENDING") return "sample_pending_count";
  if (event === "SAMPLE_REJECTED") return "sample_rejected_count";
  if (event === "QC_PENDING") return "qc_pending_count";
  if (event === "QC_ISSUES") return "qc_issues_count";
  if (event === "QC_FAILED") return "qc_failed_count";
  if (event === "BOOKING_DUE") return "booking_due_count";
  if (event === "CLOSING_DUE") return "closing_due_count";
  if (event === "TRIAL_PENDING") return "trial_pending_count";
  if (event === "ETD_SOON") return "etd_soon_count";
  return null;
}

function summaryCounterKey(event?: string | null) {
  if (event === "SHIPPING_OVERDUE") return "shipping_overdue_count";
  if (event === "INSPECTION_DUE") return "inspection_due_count";
  if (event === "SAMPLE_PENDING") return "sample_pending_count";
  if (event === "QC_PENDING") return "qc_pending_count";
  return null;
}

function applyCustomerScope<T extends { customer: string | null }>(
  rows: T[],
  canSeeAllCustomers: boolean,
  customers: string[]
) {
  if (canSeeAllCustomers) return rows;
  if (customers.length === 0) return [];

  const allowed = new Set(customers);

  return rows.filter((row) => row.customer && allowed.has(row.customer));
}

export async function getCommandCenterBundle(): Promise<CommandCenterBundle> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess();

  const [summaryResult, eventsResult] = await Promise.all([
    supabase
      .from("vw_customer_daily_alert_summary_v2")
      .select("*")
      .order("priority", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("etd_pi", { ascending: true }),

    supabase
      .from("vw_customer_daily_alert_events_v2")
      .select("*")
      .order("priority", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("etd_pi", { ascending: true }),
  ]);

  if (summaryResult.error) {
    console.error("[getCommandCenterBundle][summary]", summaryResult.error);
  }

  if (eventsResult.error) {
    console.error("[getCommandCenterBundle][events]", eventsResult.error);
  }

  const summaries = applyCustomerScope(
    (summaryResult.data ?? []) as CommandCenterAlertSummary[],
    access.canSeeAllCustomers,
    access.customers
  );

  const events = applyCustomerScope(
    (eventsResult.data ?? []) as CommandCenterAlertEvent[],
    access.canSeeAllCustomers,
    access.customers
  );

  const map = new Map<string, CommandCenterCustomerGroup>();

  for (const row of summaries) {
    const customer = row.customer || "Sin cliente";
    const group = map.get(customer) ?? emptyGroup(customer);

    group.fronts_count += 1;
    group.qty_total += Number(row.qty_total ?? 0);

    addUnique(group.seasons, row.season);
    addUnique(group.suppliers, row.supplier);

    if (row.alert_level === "CRITICAL") group.critical_count += 1;
    if (row.alert_level === "WARNING") group.warning_count += 1;
    if (row.alert_level === "MONITOR") group.monitor_count += 1;

    const isBetterTop =
      row.priority < group.top_priority ||
      (row.priority === group.top_priority && row.sort_order < group.top_sort_order);

    if (isBetterTop) {
      group.top_alert_level = row.alert_level;
      group.top_alert_event = row.top_alert_event;
      group.top_priority = row.priority;
      group.top_sort_order = row.sort_order;
    }

    if (isEarlierDate(row.etd_pi, group.next_etd)) {
      group.next_etd = row.etd_pi;
    }

    map.set(customer, group);
  }

  for (const event of events) {
    const customer = event.customer || "Sin cliente";
    const group = map.get(customer) ?? emptyGroup(customer);
    const key = eventCounterKey(event.alert_event);

    if (key) {
      group[key] += 1;
    }

    map.set(customer, group);
  }

  const customers = [...map.values()].sort((a, b) => {
    if (a.top_priority !== b.top_priority) return a.top_priority - b.top_priority;
    if (a.top_sort_order !== b.top_sort_order) return a.top_sort_order - b.top_sort_order;
    return a.customer.localeCompare(b.customer);
  });

  const stats = emptyStats();

  stats.customers_with_fronts = customers.length;
  stats.fronts_total = summaries.length;
  stats.critical_customers = customers.filter((row) => row.critical_count > 0).length;
  stats.warning_customers = customers.filter((row) => row.warning_count > 0).length;
  stats.monitor_customers = customers.filter((row) => row.monitor_count > 0).length;

  for (const row of summaries) {
    const key = summaryCounterKey(row.top_alert_event);

    if (key) {
      stats[key] += 1;
    }
  }

  return {
    customers,
    stats,
    access: {
      email: access.email,
      role: access.role,
      canSeeAllCustomers: access.canSeeAllCustomers,
      customers: access.customers,
    },
  };
}