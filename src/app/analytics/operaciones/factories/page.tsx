import Link from "next/link";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { OperacionesFactoriesFiltersBar } from "@/components/analytics/filters/OperacionesFactoriesFiltersBar";
import { AnalyticsPageShell } from "@/components/analytics/layout/AnalyticsPageShell";
import { AnalyticsPageHeader } from "@/components/navigation/analytics-page-header";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsTableShell } from "@/components/analytics/analytics-table-shell";

import {
  getOperacionesFactoryRanking,
  getOperacionesFilterOptions,
} from "@/lib/analytics/queries/operaciones";

import type { OperacionesFilters } from "@/lib/analytics/types/operaciones";

type OperacionesFactoriesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type GenericRow = Record<string, string | number | boolean | null>;

type RankingConfig = {
  title: string;
  labelKeys: string[];
  valueKeys: string[];
  preferredTableColumns: string[];
};

function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOperacionesFilters(
  params: Record<string, string | string[] | undefined>,
): OperacionesFilters {
  return {
    factory: getSingleParam(params.factory),
  };
}

function buildOperacionesOverviewHref(
  params: Record<string, string | string[] | undefined>,
) {
  const query = new URLSearchParams();

  const keys = [
    "season",
    "customer",
    "factory",
    "operativa",
    "dateType",
    "dateFrom",
    "dateTo",
  ];

  for (const key of keys) {
    const value = getSingleParam(params[key]);
    if (value) query.set(key, value);
  }

  const queryString = query.toString();

  return queryString
    ? `/analytics/operaciones?${queryString}`
    : "/analytics/operaciones";
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
    <AnalyticsTableShell title={title} description={`${rows.length} registros`}>
      {rows.length === 0 ? (
        <div className="p-5">
          <AnalyticsEmptyState
            title="Sin resultados"
            description="No existen datos para los filtros actuales."
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500 shadow-sm">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="bg-slate-50 px-5 py-3 font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-t transition hover:bg-slate-50"
              >
                {columns.map((column) => (
                  <td key={column} className="px-5 py-4">
                    {formatValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AnalyticsTableShell>
  );
}

const FACTORY_RISK_CONFIG: RankingConfig = {
  title: "Factory Risk Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "risk_score",
    "production_late_rate_pct",
    "late_lines",
    "po_count",
  ],
  preferredTableColumns: [
    "factory",
    "risk_level",
    "risk_score",
    "lines_with_delay_basis",
    "late_lines",
    "production_late_rate_pct",
  ],
};

const FACTORY_VOLUME_CONFIG: RankingConfig = {
  title: "Factory Volume Ranking",
  labelKeys: ["factory"],
  valueKeys: [
    "po_count",
    "qty_total",
    "buy_amount_total",
    "contribution_total",
  ],
  preferredTableColumns: [
    "factory",
    "po_count",
    "line_count",
    "qty_total",
    "buy_amount_total",
    "contribution_total",
  ],
};

export default async function OperacionesFactoriesPage({
  searchParams,
}: OperacionesFactoriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseOperacionesFilters(resolvedSearchParams);
  const overviewHref = buildOperacionesOverviewHref(resolvedSearchParams);

  const [rowsRaw, filterOptions] = await Promise.all([
    getOperacionesFactoryRanking(filters),
    getOperacionesFilterOptions(),
  ]);

  const rows = (rowsRaw ?? []) as GenericRow[];

  return (
    <AnalyticsPageShell
      title="Operaciones · Factories"
      description="Análisis operativo por factory: riesgo, retrasos y volumen."
    >
      <AnalyticsPageHeader
        title="Operaciones · Factories"
        description="Análisis operativo por factory: riesgo, retrasos y volumen."
        actions={
          <Link
            href={overviewHref}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Operaciones
          </Link>
        }
      />

      <section className="sticky top-[168px] z-20 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
        <OperacionesFactoriesFiltersBar
          factories={filterOptions.factories ?? []}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <GenericTable
          title={FACTORY_RISK_CONFIG.title}
          rows={rows}
          preferredColumns={FACTORY_RISK_CONFIG.preferredTableColumns}
        />

        <AnalyticsBarChart
          title={FACTORY_RISK_CONFIG.title}
          rows={rows}
          labelKeys={FACTORY_RISK_CONFIG.labelKeys}
          valueKeys={FACTORY_RISK_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GenericTable
          title={FACTORY_VOLUME_CONFIG.title}
          rows={rows}
          preferredColumns={FACTORY_VOLUME_CONFIG.preferredTableColumns}
        />

        <AnalyticsBarChart
          title={FACTORY_VOLUME_CONFIG.title}
          rows={rows}
          labelKeys={FACTORY_VOLUME_CONFIG.labelKeys}
          valueKeys={FACTORY_VOLUME_CONFIG.valueKeys}
          maxItems={10}
        />
      </div>
    </AnalyticsPageShell>
  );
}