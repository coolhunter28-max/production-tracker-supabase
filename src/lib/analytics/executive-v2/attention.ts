import { createClient } from "@/lib/supabase";

export type ExecutiveAttentionFilters = {
  season?: string;
  customer?: string;
};

export type ExecutiveAttentionLevel =
  | "critical"
  | "warning"
  | "monitor";

export type ExecutiveAttentionItem = {
  id: string;
  level: ExecutiveAttentionLevel;
  customer: string;
  season: string | null;
  poList: string | null;
  poIdList: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  etd: string | null;
  eventCode: string;
  title: string;
  message: string;
  priority: number;
  sortOrder: number;
};

export type ExecutiveAttention = {
  context: {
    season: string | null;
    customer: string | null;
  };

  counts: {
    critical: number;
    warning: number;
    monitor: number;
    total: number;
  };

  affectedCustomers: number;
  affectedProductions: number;
  items: ExecutiveAttentionItem[];
};

type AlertLevel = "CRITICAL" | "WARNING" | "MONITOR";

type DailyAlertEventRow = {
  operational_group_key: string | null;
  alert_event_key: string | null;
  customer: string | null;
  season: string | null;
  etd_pi: string | null;
  po_id_list: string | null;
  po_list: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  alert_event: string | null;
  alert_level: AlertLevel | null;
  priority: number | string | null;
  sort_order: number | string | null;
  alert_title: string | null;
  alert_message: string | null;
};

const ALERT_COLUMNS =
  "operational_group_key,alert_event_key,customer,season,etd_pi,po_id_list,po_list,reference,style,color,alert_event,alert_level,priority,sort_order,alert_title,alert_message" as const;

const EVENT_LABELS: Record<string, string> = {
  SAMPLE_REJECTED: "Muestra rechazada",
  SAMPLE_PENDING: "Muestra pendiente",
  TRIAL_PENDING: "Trial pendiente",
  INSPECTION_DUE: "Inspección pendiente",
  BOOKING_DUE: "Booking pendiente",
  CLOSING_DUE: "Closing pendiente",
  SHIPPING_OVERDUE: "Embarque vencido",
  ETD_SOON: "ETD próximo",
  QC_FAILED: "QC rechazado",
  QC_ISSUES: "Incidencias de calidad",
  QC_PENDING: "QC pendiente",
};

function cleanFilter(value?: string): string | null {
  const cleaned = value?.trim();

  return cleaned || null;
}

function toNumber(value: number | string | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toAttentionLevel(
  level: AlertLevel | null
): ExecutiveAttentionLevel {
  switch (level) {
    case "CRITICAL":
      return "critical";

    case "WARNING":
      return "warning";

    default:
      return "monitor";
  }
}

function eventLabel(eventCode: string): string {
  return (
    EVENT_LABELS[eventCode] ??
    eventCode.replaceAll("_", " ")
  );
}

function buildFallbackMessage(
  row: DailyAlertEventRow,
  title: string
): string {
  const context = [
    row.po_list ? `PO ${row.po_list}` : null,
    row.style,
    row.color,
  ]
    .filter(Boolean)
    .join(" · ");

  return context
    ? `${title}. ${context}.`
    : `${title}.`;
}

function mapAttentionItem(
  row: DailyAlertEventRow
): ExecutiveAttentionItem {
  const eventCode =
    row.alert_event?.trim() || "OPERATIONAL_ALERT";

  const title =
    row.alert_title?.trim() ||
    eventLabel(eventCode);

  return {
    id:
      row.alert_event_key?.trim() ||
      [
        row.operational_group_key,
        eventCode,
        row.priority,
        row.sort_order,
      ].join("|"),

    level: toAttentionLevel(row.alert_level),
    customer: row.customer?.trim() || "Sin cliente",
    season: row.season,
    poList: row.po_list,
    poIdList: row.po_id_list,
    reference: row.reference,
    style: row.style,
    color: row.color,
    etd: row.etd_pi,
    eventCode,
    title,
    message:
      row.alert_message?.trim() ||
      buildFallbackMessage(row, title),
    priority: toNumber(row.priority),
    sortOrder: toNumber(row.sort_order),
  };
}

export async function getExecutiveAttention(
  filters: ExecutiveAttentionFilters = {}
): Promise<ExecutiveAttention> {
  const supabase = await createClient();

  const season = cleanFilter(filters.season);
  const customer = cleanFilter(filters.customer);

  let query = supabase
    .from("vw_customer_daily_alert_events_v2")
    .select(ALERT_COLUMNS)
    .order("priority", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("etd_pi", {
      ascending: true,
      nullsFirst: false,
    })
    .order("customer", { ascending: true });

  if (season) {
    query = query.eq("season", season);
  }

  if (customer) {
    query = query.eq("customer", customer);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `[getExecutiveAttention] No se pudo cargar la atención ejecutiva: ${error.message}`
    );
  }

  const rows =
    (data ?? []) as unknown as DailyAlertEventRow[];

  const counts = rows.reduce(
    (result, row) => {
      if (row.alert_level === "CRITICAL") {
        result.critical += 1;
      } else if (row.alert_level === "WARNING") {
        result.warning += 1;
      } else if (row.alert_level === "MONITOR") {
        result.monitor += 1;
      }

      result.total += 1;

      return result;
    },
    {
      critical: 0,
      warning: 0,
      monitor: 0,
      total: 0,
    }
  );

  const affectedCustomers = new Set(
    rows
      .map((row) => row.customer?.trim())
      .filter(
        (value): value is string =>
          Boolean(value)
      )
  ).size;

  const affectedProductions = new Set(
    rows
      .map((row) =>
        row.operational_group_key?.trim()
      )
      .filter(
        (value): value is string =>
          Boolean(value)
      )
  ).size;

  const items = rows
    .map(mapAttentionItem)
    .slice(0, 6);

  return {
    context: {
      season,
      customer,
    },

    counts,
    affectedCustomers,
    affectedProductions,
    items,
  };
}