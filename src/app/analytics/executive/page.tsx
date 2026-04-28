import Link from "next/link";
import {
  getExecutiveDashboardData,
  getExecutiveFilterOptions,
} from "@/lib/analytics/queries/executive";
import type { ExecutiveFilters } from "@/lib/analytics/types/executive";

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

function KpiGrid({ rows }: { rows: GenericRow[] }) {
  const firstRow = rows[0] ?? {};
  const entries = Object.entries(firstRow).slice(0, 12);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{key}</p>
          <p className="mt-2 text-2xl font-semibold">{formatValue(value)}</p>
        </div>
      ))}
    </section>
  );
}

export default async function ExecutivePage({
  searchParams,
}: ExecutivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseExecutiveFilters(resolvedSearchParams);

  const [data, filterOptions] = await Promise.all([
    getExecutiveDashboardData(filters),
    getExecutiveFilterOptions(),
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

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
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