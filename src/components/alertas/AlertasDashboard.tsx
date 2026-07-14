"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type AlertLevel = "CRITICAL" | "WARNING" | "MONITOR";

type DailyAlertEvent = {
  operational_group_key: string;
  alert_event_key: string;
  customer: string | null;
  season: string | null;
  supplier: string | null;
  etd_pi: string | null;
  po_id_list: string | null;
  po_list: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qty_total: number | null;
  alert_event: string;
  alert_level: AlertLevel;
  priority: number;
  sort_order: number;
  alert_title: string | null;
  alert_message: string | null;
  alert_date: string | null;
  generated_at: string | null;
};

type OperationalGroup = {
  key: string;
  customer: string;
  season: string | null;
  supplier: string | null;
  etdPi: string | null;
  poIdList: string | null;
  poList: string | null;
  reference: string | null;
  style: string | null;
  color: string | null;
  qtyTotal: number | null;
  highestLevel: AlertLevel;
  priority: number;
  events: DailyAlertEvent[];
};

type CustomerGroup = {
  customer: string;
  highestLevel: AlertLevel;
  priority: number;
  alertCount: number;
  criticalCount: number;
  warningCount: number;
  monitorCount: number;
  productions: OperationalGroup[];
};

const ALL = "Todos";

const ALERT_COLUMNS =
  "operational_group_key,alert_event_key,customer,season,supplier,etd_pi,po_id_list,po_list,reference,style,color,qty_total,alert_event,alert_level,priority,sort_order,alert_title,alert_message,alert_date,generated_at" as const;

const LEVEL_ORDER: AlertLevel[] = [
  "CRITICAL",
  "WARNING",
  "MONITOR",
];

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  CRITICAL: 1,
  WARNING: 2,
  MONITOR: 3,
};

const LEVEL_LABELS: Record<AlertLevel, string> = {
  CRITICAL: "Crítica",
  WARNING: "Atención",
  MONITOR: "Seguimiento",
};

const LEVEL_SUMMARY_TEXT: Record<AlertLevel, string> = {
  CRITICAL: "requieren acción inmediata",
  WARNING: "requieren seguimiento",
  MONITOR: "monitorización activa",
};

const LEVEL_CARD_CLASSES: Record<AlertLevel, string> = {
  CRITICAL:
    "border-red-200 bg-red-50 text-red-700",
  WARNING:
    "border-orange-200 bg-orange-50 text-orange-700",
  MONITOR:
    "border-blue-200 bg-blue-50 text-blue-700",
};

const LEVEL_BADGE_CLASSES: Record<AlertLevel, string> = {
  CRITICAL:
    "border-red-200 bg-red-50 text-red-700",
  WARNING:
    "border-orange-200 bg-orange-50 text-orange-700",
  MONITOR:
    "border-blue-200 bg-blue-50 text-blue-700",
};

const LEVEL_SIDE_CLASSES: Record<AlertLevel, string> = {
  CRITICAL: "border-l-red-500",
  WARNING: "border-l-orange-500",
  MONITOR: "border-l-blue-500",
};

const EVENT_LABELS: Record<string, string> = {
  SAMPLE_REJECTED: "Muestra rechazada",
  SAMPLE_PENDING: "Muestra pendiente",
  TRIAL_PENDING: "Trial pendiente",
  INSPECTION_DUE: "Inspección pendiente",
  BOOKING_DUE: "Booking pendiente",
  CLOSING_DUE: "Closing pendiente",
  SHIPPING_OVERDUE: "Shipping vencido",
  ETD_SOON: "ETD próximo",
  QC_FAILED: "QC rechazado",
  QC_ISSUES: "Incidencias QC",
  QC_PENDING: "QC pendiente",
};

function normalizedText(
  value: string | null | undefined
): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("es");
}

function eventLabel(event: string): string {
  return (
    EVENT_LABELS[event] ??
    event.replaceAll("_", " ")
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatQuantity(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("es-ES").format(value);
}

function splitList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSinglePo(
  poList: string | null,
  poIdList: string | null
): { po: string; id: string } | null {
  const pos = splitList(poList);
  const ids = splitList(poIdList);

  if (pos.length !== 1 || ids.length !== 1) {
    return null;
  }

  return {
    po: pos[0],
    id: ids[0],
  };
}

function getHighestLevel(
  alerts: DailyAlertEvent[]
): AlertLevel {
  return alerts.reduce<AlertLevel>(
    (highest, alert) =>
      LEVEL_PRIORITY[alert.alert_level] <
      LEVEL_PRIORITY[highest]
        ? alert.alert_level
        : highest,
    "MONITOR"
  );
}

function buildFichaClienteHref(
  group: OperationalGroup
): string {
  const params = new URLSearchParams();

  params.set("customer", group.customer);

  if (group.season) {
    params.set("season", group.season);
  }

  if (group.supplier) {
    params.set("supplier", group.supplier);
  }

  if (group.style) {
    params.set("style", group.style);
  }

  params.set("onlyActions", "1");

  return `/ficha-cliente?${params.toString()}`;
}

function buildOperationalGroups(
  alerts: DailyAlertEvent[]
): OperationalGroup[] {
  const map = new Map<string, DailyAlertEvent[]>();

  for (const alert of alerts) {
    const current =
      map.get(alert.operational_group_key) ?? [];

    current.push(alert);
    map.set(alert.operational_group_key, current);
  }

  return Array.from(map.entries())
    .map(([key, events]) => {
      const sortedEvents = [...events].sort(
        (a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }

          return a.sort_order - b.sort_order;
        }
      );

      const first = sortedEvents[0];
      const highestLevel =
        getHighestLevel(sortedEvents);

      return {
        key,
        customer:
          first.customer?.trim() || "Sin cliente",
        season: first.season,
        supplier: first.supplier,
        etdPi: first.etd_pi,
        poIdList: first.po_id_list,
        poList: first.po_list,
        reference: first.reference,
        style: first.style,
        color: first.color,
        qtyTotal: first.qty_total,
        highestLevel,
        priority: LEVEL_PRIORITY[highestLevel],
        events: sortedEvents,
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      const etdA = a.etdPi ?? "9999-12-31";
      const etdB = b.etdPi ?? "9999-12-31";

      if (etdA !== etdB) {
        return etdA.localeCompare(etdB);
      }

      return (a.poList ?? "").localeCompare(
        b.poList ?? "",
        "es"
      );
    });
}

function buildCustomerGroups(
  productions: OperationalGroup[]
): CustomerGroup[] {
  const map = new Map<
    string,
    OperationalGroup[]
  >();

  for (const production of productions) {
    const current =
      map.get(production.customer) ?? [];

    current.push(production);
    map.set(production.customer, current);
  }

  return Array.from(map.entries())
    .map(([customer, customerProductions]) => {
      const criticalCount =
        customerProductions.reduce(
          (total, production) =>
            total +
            production.events.filter(
              (event) =>
                event.alert_level === "CRITICAL"
            ).length,
          0
        );

      const warningCount =
        customerProductions.reduce(
          (total, production) =>
            total +
            production.events.filter(
              (event) =>
                event.alert_level === "WARNING"
            ).length,
          0
        );

      const monitorCount =
        customerProductions.reduce(
          (total, production) =>
            total +
            production.events.filter(
              (event) =>
                event.alert_level === "MONITOR"
            ).length,
          0
        );

      const priority = Math.min(
        ...customerProductions.map(
          (production) => production.priority
        )
      );

      const highestLevel =
        LEVEL_ORDER.find(
          (level) =>
            LEVEL_PRIORITY[level] === priority
        ) ?? "MONITOR";

      return {
        customer,
        highestLevel,
        priority,
        alertCount:
          criticalCount +
          warningCount +
          monitorCount,
        criticalCount,
        warningCount,
        monitorCount,
        productions: customerProductions,
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return a.customer.localeCompare(
        b.customer,
        "es"
      );
    });
}

function AlertEventChip({
  alert,
}: {
  alert: DailyAlertEvent;
}) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
        LEVEL_BADGE_CLASSES[alert.alert_level]
      }`}
      title={
        alert.alert_message ??
        alert.alert_title ??
        eventLabel(alert.alert_event)
      }
    >
      {eventLabel(alert.alert_event)}
    </span>
  );
}

function ProductionRow({
  production,
}: {
  production: OperationalGroup;
}) {
  const singlePo = getSinglePo(
    production.poList,
    production.poIdList
  );

  const primaryAlert = production.events[0];

  return (
    <div
      className={`border-l-4 ${
        LEVEL_SIDE_CLASSES[
          production.highestLevel
        ]
      }`}
    >
      <div className="grid gap-4 border-t border-slate-200 px-4 py-4 first:border-t-0 xl:grid-cols-[110px_minmax(220px,1.1fr)_minmax(190px,0.8fr)_minmax(260px,1.2fr)_auto] xl:items-center">
        <div>
          <span
            className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase ${
              LEVEL_BADGE_CLASSES[
                production.highestLevel
              ]
            }`}
          >
            {LEVEL_LABELS[
              production.highestLevel
            ]}
          </span>
        </div>

        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-950">
            {production.poList
              ? `PO ${production.poList}`
              : "Producción sin PO visible"}
          </div>

          <div className="mt-1 text-sm text-slate-600">
            {[production.style, production.color]
              .filter(Boolean)
              .join(" · ") || "Sin modelo visible"}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {[
              production.reference
                ? `Ref: ${production.reference}`
                : null,
              production.supplier
                ? `Supplier: ${production.supplier}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        <div className="min-w-0 border-slate-200 xl:border-l xl:pl-5">
          <div
            className={`text-sm font-semibold ${
              primaryAlert.alert_level ===
              "CRITICAL"
                ? "text-red-700"
                : primaryAlert.alert_level ===
                    "WARNING"
                  ? "text-orange-700"
                  : "text-blue-700"
            }`}
          >
            {eventLabel(
              primaryAlert.alert_event
            )}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            ETD {formatDate(production.etdPi)}
            {" · "}
            Qty{" "}
            {formatQuantity(
              production.qtyTotal
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-slate-200 xl:border-l xl:pl-5">
          {production.events.map((alert) => (
            <AlertEventChip
              key={alert.alert_event_key}
              alert={alert}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {singlePo ? (
            <Link
              href={`/po/${singlePo.id}/editar`}
              className="inline-flex min-w-[116px] items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Abrir pedido
            </Link>
          ) : null}

          <Link
            href={buildFichaClienteHref(
              production
            )}
            className="inline-flex min-w-[116px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ficha Cliente
          </Link>

          <details className="relative">
            <summary className="inline-flex min-w-[116px] cursor-pointer list-none items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Ver alertas
            </summary>

            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 xl:absolute xl:right-0 xl:z-20 xl:w-[380px] xl:bg-white xl:shadow-lg">
              <div className="space-y-3">
                {production.events.map(
                  (alert) => (
                    <div
                      key={
                        alert.alert_event_key
                      }
                      className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            LEVEL_BADGE_CLASSES[
                              alert.alert_level
                            ]
                          }`}
                        >
                          {
                            LEVEL_LABELS[
                              alert.alert_level
                            ]
                          }
                        </span>

                        <span className="text-sm font-semibold text-slate-900">
                          {eventLabel(
                            alert.alert_event
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {alert.alert_message ??
                          alert.alert_title ??
                          "Requiere revisión operativa."}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function CustomerSection({
  group,
  defaultOpen,
}: {
  group: CustomerGroup;
  defaultOpen: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={`overflow-hidden rounded-lg border border-l-4 bg-white ${
        LEVEL_SIDE_CLASSES[group.highestLevel]
      }`}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-base font-bold text-slate-950">
            {group.customer}
          </span>

          {group.criticalCount > 0 ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              {group.criticalCount}{" "}
              {group.criticalCount === 1
                ? "crítica"
                : "críticas"}
            </span>
          ) : null}

          {group.warningCount > 0 ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
              {group.warningCount} atención
            </span>
          ) : null}

          {group.monitorCount > 0 ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {group.monitorCount} seguimiento
            </span>
          ) : null}

          <span className="text-sm text-slate-500">
            {group.alertCount}{" "}
            {group.alertCount === 1
              ? "alerta"
              : "alertas"}
          </span>
        </div>

        <span className="text-sm text-slate-500">
          {group.productions.length}{" "}
          {group.productions.length === 1
            ? "producción"
            : "producciones"}
        </span>
      </summary>

      <div className="border-t border-slate-200">
        {group.productions.map(
          (production) => (
            <ProductionRow
              key={production.key}
              production={production}
            />
          )
        )}
      </div>
    </details>
  );
}

export default function AlertasDashboard() {
  const supabase = useMemo(
    () => createBrowserSupabaseClient(),
    []
  );

  const [alerts, setAlerts] = useState<
    DailyAlertEvent[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [customerFilter, setCustomerFilter] =
    useState(ALL);

  const [levelFilter, setLevelFilter] =
    useState(ALL);

  const [eventFilter, setEventFilter] =
    useState(ALL);

  const [searchText, setSearchText] =
    useState("");

  const loadAlerts = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const {
        data,
        error: queryError,
      } = await supabase
        .from(
          "vw_customer_daily_alert_events_v2"
        )
        .select(ALERT_COLUMNS)
        .order("priority", {
          ascending: true,
        })
        .order("sort_order", {
          ascending: true,
        })
        .order("etd_pi", {
          ascending: true,
          nullsFirst: false,
        })
        .order("customer", {
          ascending: true,
        });

      if (queryError) {
        console.error(
          "[AlertasDashboard] Error loading alerts:",
          queryError
        );

        setAlerts([]);
        setError(
          "No se han podido cargar las alertas operativas."
        );
      } else {
        setAlerts(
          (data ??
            []) as unknown as DailyAlertEvent[]
        );

        setLastUpdated(new Date());
      }

      setLoading(false);
      setRefreshing(false);
    },
    [supabase]
  );

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const customers = useMemo(
    () =>
      Array.from(
        new Set(
          alerts
            .map((alert) =>
              alert.customer?.trim()
            )
            .filter(
              (
                customer
              ): customer is string =>
                Boolean(customer)
            )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [alerts]
  );

  const events = useMemo(
    () =>
      Array.from(
        new Set(
          alerts
            .map((alert) =>
              alert.alert_event?.trim()
            )
            .filter(
              (event): event is string =>
                Boolean(event)
            )
        )
      ).sort((a, b) =>
        eventLabel(a).localeCompare(
          eventLabel(b),
          "es"
        )
      ),
    [alerts]
  );

  const levelCounts = useMemo(
    () =>
      alerts.reduce<
        Record<AlertLevel, number>
      >(
        (counts, alert) => {
          counts[alert.alert_level] += 1;
          return counts;
        },
        {
          CRITICAL: 0,
          WARNING: 0,
          MONITOR: 0,
        }
      ),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    const search =
      normalizedText(searchText);

    return alerts.filter((alert) => {
      if (
        customerFilter !== ALL &&
        alert.customer !== customerFilter
      ) {
        return false;
      }

      if (
        levelFilter !== ALL &&
        alert.alert_level !== levelFilter
      ) {
        return false;
      }

      if (
        eventFilter !== ALL &&
        alert.alert_event !== eventFilter
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        alert.customer,
        alert.season,
        alert.supplier,
        alert.po_list,
        alert.reference,
        alert.style,
        alert.color,
        alert.alert_event,
        alert.alert_title,
        alert.alert_message,
      ]
        .map(normalizedText)
        .join(" ")
        .includes(search);
    });
  }, [
    alerts,
    customerFilter,
    levelFilter,
    eventFilter,
    searchText,
  ]);

  const productions = useMemo(
    () =>
      buildOperationalGroups(
        filteredAlerts
      ),
    [filteredAlerts]
  );

  const customerGroups = useMemo(
    () => buildCustomerGroups(productions),
    [productions]
  );

  function clearFilters() {
    setCustomerFilter(ALL);
    setLevelFilter(ALL);
    setEventFilter(ALL);
    setSearchText("");
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
        Cargando alertas operativas…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Production Tracker
          </p>

          <h1 className="text-2xl font-bold text-slate-950">
            Alertas diarias
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Trabajo pendiente. Prioriza, actúa y
            cierra.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() =>
              void loadAlerts(true)
            }
            disabled={refreshing}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing
              ? "Actualizando…"
              : "Actualizar"}
          </button>

          {lastUpdated ? (
            <span className="text-xs text-slate-500">
              Última actualización:{" "}
              {lastUpdated.toLocaleTimeString(
                "es-ES",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </span>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() =>
              setLevelFilter((current) =>
                current === level
                  ? ALL
                  : level
              )
            }
            className={`rounded-xl border p-5 text-left transition hover:shadow-sm ${
              levelFilter === level
                ? LEVEL_CARD_CLASSES[level]
                : "border-slate-200 bg-white text-slate-950"
            }`}
          >
            <div className="text-3xl font-bold">
              {levelCounts[level]}
            </div>

            <div className="mt-1 font-semibold">
              {LEVEL_LABELS[level]}
            </div>

            <div className="mt-1 text-xs opacity-80">
              {LEVEL_SUMMARY_TEXT[level]}
            </div>
          </button>
        ))}

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-3xl font-bold text-slate-950">
            {alerts.length}
          </div>

          <div className="mt-1 font-semibold text-slate-950">
            Total alertas
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {buildOperationalGroups(alerts).length}{" "}
            producciones afectadas
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.6fr_auto]">
        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="block text-xs text-slate-500">
            Cliente
          </span>

          <select
            value={customerFilter}
            onChange={(event) =>
              setCustomerFilter(
                event.target.value
              )
            }
            className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
          >
            <option value={ALL}>{ALL}</option>

            {customers.map((customer) => (
              <option
                key={customer}
                value={customer}
              >
                {customer}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="block text-xs text-slate-500">
            Prioridad
          </span>

          <select
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(
                event.target.value
              )
            }
            className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
          >
            <option value={ALL}>{ALL}</option>

            {LEVEL_ORDER.map((level) => (
              <option
                key={level}
                value={level}
              >
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="block text-xs text-slate-500">
            Tipo de alerta
          </span>

          <select
            value={eventFilter}
            onChange={(event) =>
              setEventFilter(
                event.target.value
              )
            }
            className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
          >
            <option value={ALL}>{ALL}</option>

            {events.map((event) => (
              <option
                key={event}
                value={event}
              >
                {eventLabel(event)}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="sr-only">
            Buscar
          </span>

          <input
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Buscar por PO, modelo, color, referencia…"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Producciones con alertas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {customerGroups.length} clientes ·{" "}
            {productions.length} producciones ·{" "}
            {filteredAlerts.length} alertas
          </p>
        </div>

        <div className="space-y-2 bg-slate-50 p-3">
          {customerGroups.map(
            (group, index) => (
              <CustomerSection
                key={group.customer}
                group={group}
                defaultOpen={index === 0}
              />
            )
          )}

          {customerGroups.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No hay alertas que cumplan los
              filtros seleccionados.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}