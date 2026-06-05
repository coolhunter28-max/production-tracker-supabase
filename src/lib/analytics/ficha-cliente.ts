import { createClient } from "@/lib/supabase";

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

type AlertSummaryRow = {
  customer: string;
  season: string;
  supplier: string;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
} & FichaClienteAlertSummary;

type QCBridgeRow = {
  customer: string;
  season: string;
  supplier: string;
  etd_pi: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
} & FichaClienteQC;

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
  };
}

export async function getFichaClienteRows(
  filters: FichaClienteFilters = {}
): Promise<FichaClienteRow[]> {
  const supabase = await createClient();

  let boardQuery = supabase.from("vw_customer_campaign_board_v1").select("*");
  let alertQuery = supabase.from("vw_customer_daily_alert_summary_v1").select("*");
  let qcQuery = supabase.from("vw_customer_qc_trial_bridge_v1").select("*");

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
    console.error("[getFichaClienteRows][alerts]", alertResult.error);
  }

  if (qcResult.error) {
    console.error("[getFichaClienteRows][qc]", qcResult.error);
  }

  const alertMap = new Map<string, FichaClienteAlertSummary>();
  const qcMap = new Map<string, FichaClienteQC>();

  ((alertResult.data ?? []) as AlertSummaryRow[]).forEach((alert) => {
    alertMap.set(buildKey(alert), {
      highest_alert_priority: alert.highest_alert_priority,
      highest_alert_level: alert.highest_alert_level ?? "OK",
      alerts_count: alert.alerts_count,
      critical_count: alert.critical_count,
      warning_count: alert.warning_count,
      monitor_count: alert.monitor_count,
      next_alert_date: alert.next_alert_date,
      alert_types: alert.alert_types,
      primary_action_type: alert.primary_action_type,
      primary_action_label: alert.primary_action_label,
      alert_summary: alert.alert_summary,
    });
  });

  ((qcResult.data ?? []) as QCBridgeRow[]).forEach((qc) => {
    qcMap.set(buildKey(qc), {
      qc_inspection_id: qc.qc_inspection_id,
      report_number: qc.report_number,
      inspection_type: qc.inspection_type,
      inspection_date: qc.inspection_date,
      inspector: qc.inspector,
      factory: qc.factory,
      aql_result: qc.aql_result,
      critical_found: qc.critical_found,
      major_found: qc.major_found,
      minor_found: qc.minor_found,
      has_qc_report: qc.has_qc_report,
      qc_status: qc.qc_status ?? "QC_PENDING",
      qc_status_label: qc.qc_status_label ?? "No hay reporte QC vinculado.",
      qc_process_stage: qc.qc_process_stage,
      qc_process_label: qc.qc_process_label,
    });
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

  const [customers, seasons, suppliers] = await Promise.all([
    supabase.from("vw_customer_campaign_board_v1").select("customer"),
    supabase.from("vw_customer_campaign_board_v1").select("season"),
    supabase.from("vw_customer_campaign_board_v1").select("supplier"),
  ]);

  return {
    customers: [
      ...new Set((customers.data ?? []).map((r) => r.customer).filter(Boolean)),
    ].sort(),

    seasons: [
      ...new Set((seasons.data ?? []).map((r) => r.season).filter(Boolean)),
    ].sort(),

    suppliers: [
      ...new Set((suppliers.data ?? []).map((r) => r.supplier).filter(Boolean)),
    ].sort(),
  };
}