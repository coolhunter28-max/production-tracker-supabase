import Link from "next/link";
import {
  getOperacionesCustomerRanking,
  getOperacionesFilterOptions,
} from "@/lib/analytics/queries/operaciones";
import type { OperacionesFilters } from "@/lib/analytics/types/operaciones";

type OperacionesCustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type GenericRow = Record<string, unknown>;

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOperacionesFilters(
  params: Record<string, string | string[] | undefined>
): OperacionesFilters {
  const dateType = getSingleParam(params.dateType);

  return {
    season: getSingleParam(params.season),
    customer: getSingleParam(params.customer),
    factory: getSingleParam(params.factory),
    operativa: getSingleParam(params.operativa),
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

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function sumNumber(rows: GenericRow[], key: string) {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

export default async function OperacionesCustomersPage({
  searchParams,
}: OperacionesCustomersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);

  const [rowsRaw, filterOptions] = await Promise.all([
    getOperacionesCustomerRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  const rows = (rowsRaw ?? []) as GenericRow[];

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Operaciones · Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            Análisis operativo por customer: volumen, contribución y
            posicionamiento.
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
            href="/analytics/executive"
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Executive
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
            <label htmlFor="customer" className="text-sm font-medium">
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
            <label htmlFor="season" className="text-sm font-medium">
              Season
            </label>
            <select
              id="season"
              name="season"
              defaultValue={filters.season ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {(filterOptions.seasons ?? []).map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="factory" className="text-sm font-medium">
              Factory
            </label>
            <select
              id="factory"
              name="factory"
              defaultValue={filters.factory ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {(filterOptions.factories ?? []).map((factory) => (
                <option key={factory} value={factory}>
                  {factory}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="operativa" className="text-sm font-medium">
              Operativa
            </label>
            <select
              id="operativa"
              name="operativa"
              defaultValue={filters.operativa ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="BSG">BSG</option>
              <option value="XIAMEN_DIC">XIAMEN_DIC</option>
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
              href="/analytics/operaciones/customers"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Customers" value={rows.length} />
        <KpiCard title="PO Count" value={formatValue(sumNumber(rows, "po_count"))} />
        <KpiCard
          title="Qty Total"
          value={formatValue(sumNumber(rows, "qty_total"))}
        />
        <KpiCard
          title="Contribution"
          value={formatValue(sumNumber(rows, "contribution_total"))}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <GenericTable
          title="Customer Volume Ranking"
          rows={rows}
          preferredColumns={[
            "customer",
            "customer_size_band",
            "po_count",
            "sell_amount_total",
            "qty_total",
          ]}
        />

        <GenericTable
          title="Customer Contribution Ranking"
          rows={rows}
          preferredColumns={[
            "customer",
            "profitability_band",
            "contribution_total",
            "sell_amount_total",
            "po_count",
          ]}
        />
      </div>
    </div>
  );
}