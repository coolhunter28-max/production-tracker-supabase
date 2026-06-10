import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export type OperationalAlertLevel = "CRITICAL" | "WARNING" | "MONITOR" | "OK";

export type FichaClienteAlertSummary = {
  highest_alert_priority: number | null;
  highest_alert_level: OperationalAlertLevel | null;
  alerts_count: number | null;
  critical_count: number | null;
  warning_count: number | null;
  monitor_count: number | null;
  next_alert_date: string | null;
  alert_types: string | null;
  primary_action_type: string | null;
  primary_action_label: string | null;
  alert_summary: string | null;
};

export type FichaClienteQC = {
  qc_inspection_id: string | null;
  report_number: string | null;
  inspection_type: string | null;
  inspection_date: string | null;
  inspector: string | null;
  factory: string | null;
  aql_result: string | null;
  critical_found: number | null;
  major_found: number | null;
  minor_found: number | null;
  has_qc_report: boolean;
  qc_status: "QC_PENDING" | "QC_OK" | "QC_ISSUES" | "QC_FAILED";
  qc_status_label: string;
  qc_process_stage: string | null;
  qc_process_label: string | null;

  trial_upper_qc_id: string | null;
  trial_upper_report_number: string | null;
  trial_upper_qc_date: string | null;
  trial_upper_qc_status: string | null;

  trial_lasting_qc_id: string | null;
  trial_lasting_report_number: string | null;
  trial_lasting_qc_date: string | null;
  trial_lasting_qc_status: string | null;

  assembling_qc_id: string | null;
  assembling_report_number: string | null;
  assembling_qc_date: string | null;
  assembling_qc_status: string | null;

  qc_report_count: number | null;
};

export type FichaClienteRow = {
  customer: string;
  season: string;
  supplier: string;
  etd_pi: string | null;
  po_id_list: string | null;
  po_list: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qty_total: number | null;
  cfms_status: string | null;
  counters_status: string | null;
  fittings_status: string | null;
  pps_status: string | null;
  testings_status: string | null;
  shippings_status: string | null;
  trial_upper: string | null;
  trial_lasting: string | null;
  lasting: string | null;
  inspection: string | null;
  booking: string | null;
  closing: string | null;
  shipping_date: string | null;
  alert: FichaClienteAlertSummary;
  qc: FichaClienteQC;
};

type CampaignBoardRow = Omit<FichaClienteRow, "alert" | "qc">;

type AlertSummaryV2Row = {
  customer: string;
  season: string;
  supplier: string;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  alert_level: OperationalAlertLevel | null;
  priority: number | null;
  top_alert_event: string | null;
  top_alert_title: string | null;
  top_alert_message: string | null;
  alert_count: number | null;
  critical_count: number | null;
  warning_count: number | null;
  monitor_count: number | null;
};

type QCBridgeRow = {
  customer: string;
  season: string;
  supplier: string;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;

  trial_upper_qc_id: string | null;
  trial_upper_report_number: string | null;
  trial_upper_qc_date: string | null;
  trial_upper_qc_status: string | null;

  trial_lasting_qc_id: string | null;
  trial_lasting_report_number: string | null;
  trial_lasting_qc_date: string | null;
  trial_lasting_qc_status: string | null;

  assembling_qc_id: string | null;
  assembling_report_number: string | null;
  assembling_qc_date: string | null;
  assembling_qc_status: string | null;

  qc_report_count: number | null;
  qc_status: "QC_PENDING" | "QC_OK" | "QC_ISSUES" | "QC_FAILED";
};

export type FichaClienteFilters = {
  customer?: string;
  season?: string;
  supplier?: string;
  style?: string;
  onlyActions?: boolean;
};

function buildKey(row: {
  customer: string | null;
  season: string | null;
  supplier: string | null;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
}) {
  return [
    row.customer ?? "",
    row.season ?? "",
    row.supplier ?? "",
    row.etd_pi ?? "",
    row.reference ?? "",
    row.style ?? "",
    row.color ?? "",
  ].join("|");
}

function emptyAlert(): FichaClienteAlertSummary {
  return {
    highest_alert_priority: 9,
    highest_alert_level: "OK",
    alerts_count: 0,
    critical_count: 0,
    warning_count: 0,
    monitor_count: 0,
    next_alert_date: null,
    alert_types: null,
    primary_action_type: "OK",
    primary_action_label: "Sin acciones",
    alert_summary: null,
  };
}

function buildAlert(alert: AlertSummaryV2Row): FichaClienteAlertSummary {
  return {
    highest_alert_priority: alert.priority ?? 9,
    highest_alert_level: alert.alert_level ?? "OK",
    alerts_count: alert.alert_count ?? 0,
    critical_count: alert.critical_count ?? 0,
    warning_count: alert.warning_count ?? 0,
    monitor_count: alert.monitor_count ?? 0,
    next_alert_date: alert.etd_pi,
    alert_types: alert.top_alert_event,
    primary_action_type: alert.top_alert_event ?? "OK",
    primary_action_label: alert.top_alert_title ?? alert.top_alert_event ?? "Sin acciones",
    alert_summary: alert.top_alert_message,
  };
}

function emptyQC(): FichaClienteQC {
  return {
    qc_inspection_id: null,
    report_number: null,
    inspection_type: null,
    inspection_date: null,
    inspector: null,
    factory: null,
    aql_result: null,
    critical_found: null,
    major_found: null,
    minor_found: null,
    has_qc_report: false,
    qc_status: "QC_PENDING",
    qc_status_label: "No hay reporte QC vinculado.",
    qc_process_stage: null,
    qc_process_label: null,

    trial_upper_qc_id: null,
    trial_upper_report_number: null,
    trial_upper_qc_date: null,
    trial_upper_qc_status: null,

    trial_lasting_qc_id: null,
    trial_lasting_report_number: null,
    trial_lasting_qc_date: null,
    trial_lasting_qc_status: null,

    assembling_qc_id: null,
    assembling_report_number: null,
    assembling_qc_date: null,
    assembling_qc_status: null,

    qc_report_count: 0,
  };
}

function buildQC(qc: QCBridgeRow): FichaClienteQC {
  const hasTrialUpper = Boolean(qc.trial_upper_report_number);
  const hasTrialLasting = Boolean(qc.trial_lasting_report_number);
  const hasAssembling = Boolean(qc.assembling_report_number);
  const hasAnyQC = hasTrialUpper || hasTrialLasting || hasAssembling;

  const labels: string[] = [];
  if (hasTrialUpper) labels.push("Trial Upper");
  if (hasTrialLasting) labels.push("Trial Lasting");
  if (hasAssembling) labels.push("Assembling");

  const reportNumbers = [
    qc.trial_upper_report_number,
    qc.trial_lasting_report_number,
    qc.assembling_report_number,
  ].filter(Boolean) as string[];

  return {
    qc_inspection_id:
      qc.trial_lasting_qc_id ?? qc.trial_upper_qc_id ?? qc.assembling_qc_id,

    report_number: reportNumbers.join(" / ") || null,
    inspection_type: labels.join(" / ") || null,
    inspection_date:
      qc.trial_lasting_qc_date ?? qc.trial_upper_qc_date ?? qc.assembling_qc_date,

    inspector: null,
    factory: null,
    aql_result: null,
    critical_found: null,
    major_found: null,
    minor_found: null,

    has_qc_report: hasAnyQC,
    qc_status: qc.qc_status ?? "QC_PENDING",
    qc_status_label: hasAnyQC
      ? `QC recibido: ${labels.join(" + ")}`
      : "No hay reporte QC vinculado.",
    qc_process_stage: hasAnyQC ? "MULTI_STAGE_QC" : null,
    qc_process_label: labels.join(" + ") || null,

    trial_upper_qc_id: qc.trial_upper_qc_id,
    trial_upper_report_number: qc.trial_upper_report_number,
    trial_upper_qc_date: qc.trial_upper_qc_date,
    trial_upper_qc_status: qc.trial_upper_qc_status,

    trial_lasting_qc_id: qc.trial_lasting_qc_id,
    trial_lasting_report_number: qc.trial_lasting_report_number,
    trial_lasting_qc_date: qc.trial_lasting_qc_date,
    trial_lasting_qc_status: qc.trial_lasting_qc_status,

    assembling_qc_id: qc.assembling_qc_id,
    assembling_report_number: qc.assembling_report_number,
    assembling_qc_date: qc.assembling_qc_date,
    assembling_qc_status: qc.assembling_qc_status,

    qc_report_count: qc.qc_report_count ?? 0,
  };
}

async function getActiveSeasons(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("production_active_seasons")
    .select("season")
    .eq("is_active", true)
    .order("season");

  if (error) {
    console.error("[getActiveSeasons]", error);
    return [];
  }

  return (data ?? []).map((row) => row.season).filter(Boolean);
}

export async function getFichaClienteRows(
  filters: FichaClienteFilters = {}
): Promise<FichaClienteRow[]> {
  const supabase = await createClient();
  const activeSeasons = await getActiveSeasons();
  const access = await getCurrentUserAccess();

  let boardQuery = supabase.from("vw_customer_campaign_board_v1").select("*");
  let alertQuery = supabase.from("vw_customer_daily_alert_summary_v2").select("*");
  let qcQuery = supabase.from("vw_customer_qc_trial_bridge_v2").select("*");

  if (!access.canSeeAllCustomers) {
    if (access.customers.length === 0) {
      return [];
    }

    boardQuery = boardQuery.in("customer", access.customers);
    alertQuery = alertQuery.in("customer", access.customers);
    qcQuery = qcQuery.in("customer", access.customers);
  }

  if (activeSeasons.length > 0) {
    boardQuery = boardQuery.in("season", activeSeasons);
    alertQuery = alertQuery.in("season", activeSeasons);
    qcQuery = qcQuery.in("season", activeSeasons);
  }

  if (filters.customer) {
    boardQuery = boardQuery.eq("customer", filters.customer);
    alertQuery = alertQuery.eq("customer", filters.customer);
    qcQuery = qcQuery.eq("customer", filters.customer);
  }

  if (filters.season) {
    boardQuery = boardQuery.eq("season", filters.season);
    alertQuery = alertQuery.eq("season", filters.season);
    qcQuery = qcQuery.eq("season", filters.season);
  }

  if (filters.supplier) {
    boardQuery = boardQuery.eq("supplier", filters.supplier);
    alertQuery = alertQuery.eq("supplier", filters.supplier);
    qcQuery = qcQuery.eq("supplier", filters.supplier);
  }

  if (filters.style) {
    boardQuery = boardQuery.ilike("style", `%${filters.style}%`);
    alertQuery = alertQuery.ilike("style", `%${filters.style}%`);
    qcQuery = qcQuery.ilike("style", `%${filters.style}%`);
  }

  const [boardResult, alertResult, qcResult] = await Promise.all([
    boardQuery.order("customer").order("etd_pi").order("style"),
    alertQuery,
    qcQuery,
  ]);

  if (boardResult.error) {
    console.error("[getFichaClienteRows][board]", boardResult.error);
    return [];
  }

  if (alertResult.error) {
    console.error("[getFichaClienteRows][alerts-v2]", alertResult.error);
  }

  if (qcResult.error) {
    console.error("[getFichaClienteRows][qc]", qcResult.error);
  }

  const alertMap = new Map<string, FichaClienteAlertSummary>();
  const qcMap = new Map<string, FichaClienteQC>();

  ((alertResult.data ?? []) as AlertSummaryV2Row[]).forEach((alert) => {
    alertMap.set(buildKey(alert), buildAlert(alert));
  });

  ((qcResult.data ?? []) as QCBridgeRow[]).forEach((qc) => {
    qcMap.set(buildKey(qc), buildQC(qc));
  });

  const rows = ((boardResult.data ?? []) as CampaignBoardRow[]).map((row) => ({
    ...row,
    alert: alertMap.get(buildKey(row)) ?? emptyAlert(),
    qc: qcMap.get(buildKey(row)) ?? emptyQC(),
  }));

  if (filters.onlyActions) {
    return rows.filter((row) => row.alert.highest_alert_level !== "OK");
  }

  return rows;
}

export async function getFichaClienteFilters() {
  const supabase = await createClient();
  const activeSeasons = await getActiveSeasons();
  const access = await getCurrentUserAccess();

  let baseQuery = supabase
    .from("vw_customer_campaign_board_v1")
    .select("customer, season, supplier");

  if (!access.canSeeAllCustomers) {
    if (access.customers.length === 0) {
      return {
        customers: [],
        seasons: [],
        suppliers: [],
      };
    }

    baseQuery = baseQuery.in("customer", access.customers);
  }

  if (activeSeasons.length > 0) {
    baseQuery = baseQuery.in("season", activeSeasons);
  }

  const { data, error } = await baseQuery;

  if (error) {
    console.error("[getFichaClienteFilters]", error);
    return {
      customers: [],
      seasons: activeSeasons,
      suppliers: [],
    };
  }

  return {
    customers: [...new Set((data ?? []).map((r) => r.customer).filter(Boolean))].sort(),
    seasons: [...new Set((data ?? []).map((r) => r.season).filter(Boolean))].sort(),
    suppliers: [...new Set((data ?? []).map((r) => r.supplier).filter(Boolean))].sort(),
  };
}