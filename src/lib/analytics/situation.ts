import { createClient } from "@/lib/supabase";
import type {
  SituationChartRow,
  SituationChartType,
  SituationDimension,
  SituationFilterOptions,
  SituationFilters,
  SituationMetric,
} from "@/types/situation";

type FilterOptionRow = {
  season: string | null;
  customer: string | null;
  factory: string | null;
  operativa_code: string | null;
};

type PivotRow = {
  label: string | null;
  value: number | null;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item));
  }

  const single = asString(value);

  if (!single) return [];

  return single
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetric(value: unknown): SituationMetric {
  const v = asString(value);

  if (v === "sales" || v === "contribution" || v === "qty") {
    return v;
  }

  return "sales";
}

function parseDimension(value: unknown): SituationDimension {
  const v = asString(value);

  if (
    v === "customer" ||
    v === "factory" ||
    v === "season" ||
    v === "operativa"
  ) {
    return v;
  }

  return "customer";
}

function parseChart(
  value: unknown,
  dimension: SituationDimension
): SituationChartType {
  const v = asString(value);

  if (v === "line" && dimension === "season") return "line";
  if (v === "bar" || v === "donut") return v;

  return dimension === "season" ? "line" : "bar";
}

export function parseSituationSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): SituationFilters {
  const dimension = parseDimension(searchParams.dimension);

  return {
    metric: parseMetric(searchParams.metric),
    dimension,
    chart: parseChart(searchParams.chart, dimension),
    seasons: asStringArray(searchParams.seasons ?? searchParams.season),
    customers: asStringArray(searchParams.customers ?? searchParams.customer),
    factories: asStringArray(searchParams.factories ?? searchParams.factory),
    operativas: asStringArray(searchParams.operativas ?? searchParams.operativa),
  };
}

export async function getSituationChartData(
  filters: SituationFilters
): Promise<SituationChartRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_situation_pivot_v2", {
    p_metric: filters.metric,
    p_dimension: filters.dimension,
    p_seasons: filters.seasons.length ? filters.seasons : null,
    p_customers: filters.customers.length ? filters.customers : null,
    p_factories: filters.factories.length ? filters.factories : null,
    p_operativas: filters.operativas.length ? filters.operativas : null,
    p_limit: 20,
  });

  if (error) {
    console.error("[situation] pivot v2 error", error);
    return [];
  }

  const rows = (data ?? []) as PivotRow[];

  return rows.map((row) => ({
    label: String(row.label ?? "—"),
    value: Number(row.value ?? 0),
  }));
}

export async function getSituationFilterOptions(): Promise<SituationFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mv_fact_operacion_linea")
    .select("season, customer, factory, operativa_code")
    .limit(10000);

  if (error) {
    console.error("[situation] filter options error", error);

    return {
      seasons: [],
      customers: [],
      factories: [],
      operativas: [],
    };
  }

  const rows = (data ?? []) as FilterOptionRow[];

  return {
    seasons: unique(rows.map((row) => row.season)),
    customers: unique(rows.map((row) => row.customer)),
    factories: unique(rows.map((row) => row.factory)),
    operativas: unique(rows.map((row) => row.operativa_code)),
  };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function formatSituationValue(metric: SituationMetric, value: number) {
  if (metric === "qty") {
    return value.toLocaleString("es-ES");
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const situationMetricLabels: Record<SituationMetric, string> = {
  sales: "Sales $",
  contribution: "Contribution $",
  qty: "Quantity",
};

export const situationDimensionLabels: Record<SituationDimension, string> = {
  customer: "Customer",
  factory: "Factory",
  season: "Season",
  operativa: "Operativa",
};

export const situationChartLabels: Record<SituationChartType, string> = {
  bar: "Bar",
  donut: "Donut",
  line: "Line",
};