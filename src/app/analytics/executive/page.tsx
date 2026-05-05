import Link from "next/link";
import {
  getExecutiveDashboardData,
  getExecutiveFilterOptions,
} from "@/lib/analytics/queries/executive";
import { getCustomerCommercialAlerts } from "@/lib/analytics/clientes";
import { createClient } from "@/lib/supabase";
import type { ExecutiveFilters } from "@/lib/analytics/types/executive";
import type { CustomerCommercialAlert } from "@/types/clientes";

type ExecutivePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type GenericRow = Record<string, unknown>;

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseExecutiveFilters(
  params: Record<string, string | string[] | undefined>
): ExecutiveFilters {
  const dateType = getSingleParam(params.dateType);

  return {
    season: getSingleParam(params.season),
    customer: getSingleParam(params.customer),
    factory: getSingleParam(params.factory),
    dateType:
      dateType === "po" ||
      dateType === "pi_etd" ||
      dateType === "finish" ||
      dateType === "shipping"
        ? dateType
        : "shipping",
    dateFrom: getSingleParam(params.dateFrom),
    dateTo: getSingleParam(params.dateTo),
  };
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "-";

  if (typeof value === "number") {
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  return String(value);
}

function getColumns(rows: GenericRow[], preferred: string[]) {
  const available = new Set(rows.flatMap((row) => Object.keys(row)));
  const preferredExisting = preferred.filter((key) => available.has(key));
  const fallback = Array.from(available).slice(0, 8);

  return preferredExisting.length > 0 ? preferredExisting : fallback;
}

function GenericTable({
  title,
  rows,
  preferredColumns,
}: {
  title: string;
  rows: GenericRow[];
  preferredColumns: string[];
}) {
  const columns = getColumns(rows, preferredColumns);

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{rows.length} registros</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No hay datos.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-t">
                  {columns.map((column) => (
                    <td key={column} className="px-5 py-4">
                      {formatValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getKpiLabel(key: string) {
  const labels: Record<string, string> = {
    po_count: "POs",
    line_count: "Líneas",
    customer_count: "Clientes",
    factory_count: "Fábricas",
    model_count: "Modelos",
    qty_total: "Pares ",
    sell_amount_total: "Ventas $",
    buy_amount_total: "Coste $",
    margin_bsg_total: "Margen BSG $",
    margin_xiamen_total: "Margen Xiamen $",
    contribution_total: "Margen total $",
    contribution_pct: "Margen %",
    xiamen_sales_mix_pct: "Mix Xiamen %",
    bsg_sales_mix_pct: "Mix BSG %",
    xiamen_margin_pct: "Margen Xiamen %",
    bsg_margin_pct: "Margen BSG %",
  };

  return labels[key] ?? key;
}

function KpiGrid({ rows }: { rows: GenericRow[] }) {
  const firstRow = rows[0] ?? {};

  const preferredOrder = [
    "po_count",
    "line_count",
    "customer_count",
    "factory_count",
    "model_count",
    "qty_total",
    "sell_amount_total",
    "buy_amount_total",
    "margin_bsg_total",
    "margin_xiamen_total",
    "contribution_total",
    "contribution_pct",
    "xiamen_sales_mix_pct",
    "bsg_sales_mix_pct",
    "xiamen_margin_pct",
    "bsg_margin_pct",
  ];

  const entries = preferredOrder
    .filter((key) => Object.prototype.hasOwnProperty.call(firstRow, key))
    .map((key) => [key, firstRow[key]] as const);

    return (
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border bg-white px-3 py-2 shadow-sm"
          >
            <p className="text-xs text-muted-foreground leading-none">
              {getKpiLabel(key)}
            </p>
            <p className="mt-1 text-lg font-semibold leading-none">
              {key.endsWith("_pct")
                ? `${formatValue(value)}%`
                : formatValue(value)}
            </p>
          </div>
        ))}
      </section>
    );
}

function AlertBadge({
  level,
}: {
  level: CustomerCommercialAlert["alert_level"];
}) {
  const className =
    level === "CRITICAL"
      ? "bg-red-100 text-red-700 ring-red-200"
      : level === "WARNING"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-blue-100 text-blue-700 ring-blue-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {level}
    </span>
  );
}

function buildOperacionesCustomerHref(
  customer: string,
  filters: ExecutiveFilters
) {
  const query = new URLSearchParams();
  query.set("customer", customer);

  if (filters.season) query.set("season", filters.season);
  if (filters.dateType) query.set("dateType", filters.dateType);
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);

  return `/analytics/operaciones/customers?${query.toString()}`;
}

function CommercialPriorityStrip({
  alerts,
  filters,
}: {
  alerts: CustomerCommercialAlert[];
  filters: ExecutiveFilters;
}) {
  const criticalAlerts = alerts.filter(
    (alert) => alert.alert_level === "CRITICAL"
  );
  const warningAlerts = alerts.filter(
    (alert) => alert.alert_level === "WARNING"
  );

  const priorityAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 5);

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Commercial Priority</h2>
          <p className="text-sm text-muted-foreground">
            Solo clientes CRITICAL y WARNING desde{" "}
            <span className="font-medium">vw_customer_commercial_alerts</span>.
          </p>
        </div>

        <Link
          href="/analytics/clientes"
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Ver Situation Board
        </Link>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-red-50 p-4">
            <p className="text-xs font-medium text-red-700">CRITICAL</p>
            <p className="mt-1 text-3xl font-semibold text-red-900">
              {criticalAlerts.length}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Requieren revisión inmediata.
            </p>
          </div>

          <div className="rounded-xl border bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-700">WARNING</p>
            <p className="mt-1 text-3xl font-semibold text-amber-900">
              {warningAlerts.length}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Requieren seguimiento comercial.
            </p>
          </div>
        </div>

        {priorityAlerts.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No hay prioridades comerciales críticas o warning.
          </div>
        ) : (
          <div className="space-y-3">
            {priorityAlerts.map((alert) => (
              <div
                key={`${alert.customer}-${alert.alert_type}`}
                className="rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{alert.customer}</p>
                      <AlertBadge level={alert.alert_level} />
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.contextual_business_profile ?? "Sin perfil"} ·{" "}
                      {alert.alert_type.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/analytics/clientes/${encodeURIComponent(
                        alert.customer
                      )}`}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Ver cliente
                    </Link>

                    <Link
                      href={buildOperacionesCustomerHref(
                        alert.customer,
                        filters
                      )}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Ver operaciones
                    </Link>
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium">
                  {alert.alert_reason ?? "Sin motivo disponible"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.recommended_action ?? "Sin acción recomendada"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function ExecutivePage({
  searchParams,
}: ExecutivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseExecutiveFilters(resolvedSearchParams);
  const supabase = await createClient();

  const [data, filterOptions, alerts] = await Promise.all([
    getExecutiveDashboardData(filters),
    getExecutiveFilterOptions(),
    getCustomerCommercialAlerts(supabase),
  ]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Vista ejecutiva basada en views reales de Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analytics/clientes"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Clientes
          </Link>
          <Link
            href="/analytics/operaciones/customers"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Operaciones
          </Link>
          <Link
            href="/analytics/desarrollo/customers"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Desarrollo
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="season">
              Season
            </label>
            <select
              id="season"
              name="season"
              defaultValue={filters.season ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {filterOptions.seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="customer">
              Customer
            </label>
            <select
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {filterOptions.customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="factory">
              Factory
            </label>
            <select
              id="factory"
              name="factory"
              defaultValue={filters.factory ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {filterOptions.factories.map((factory) => (
                <option key={factory} value={factory}>
                  {factory}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="dateType">
              Date Type
            </label>
            <select
              id="dateType"
              name="dateType"
              defaultValue={filters.dateType}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="shipping">Shipping</option>
              <option value="po">PO</option>
              <option value="pi_etd">PI ETD</option>
              <option value="finish">Finish</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Aplicar filtros
            </button>

            <Link
              href="/analytics/executive"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <KpiGrid rows={(data.kpis ?? []) as GenericRow[]} />

      <CommercialPriorityStrip alerts={alerts} filters={filters} />

      <div className="grid gap-6 xl:grid-cols-2">
        <GenericTable
          title="Customer Ranking"
          rows={(data.customerRanking ?? []) as GenericRow[]}
          preferredColumns={[
            "customer",
            "customer_size_band",
            "profitability_band",
            "po_count",
            "contribution_total",
          ]}
        />

        <GenericTable
          title="Factory Ranking"
          rows={(data.factoryRanking ?? []) as GenericRow[]}
          preferredColumns={[
            "factory",
            "risk_level",
            "risk_score",
            "late_lines",
            "production_late_rate_pct",
          ]}
        />
      </div>

      <GenericTable
        title="Season Performance Ranking"
        rows={(data.seasonRanking ?? []) as GenericRow[]}
        preferredColumns={[
          "season",
          "po_count",
          "line_count",
          "qty_total",
          "contribution_total",
        ]}
      />
    </div>
  );
}