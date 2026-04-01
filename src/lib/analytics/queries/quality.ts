import { createClient } from "@/lib/supabase";
import type {
  QualityByCustomerRow,
  QualityByFactoryRow,
  QualityByModelRow,
  QualityFilterOptions,
  QualityFilters,
  QualityOverviewData,
} from "@/lib/analytics/types/quality";

function applyTextFilter<TQuery>(
  query: TQuery,
  column: string,
  value?: string
): TQuery {
  if (!value || !String(value).trim()) return query;
  return (query as any).ilike(column, `%${value.trim()}%`);
}

function uniqueSortedStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0
        )
        .map((value) => value.trim())
    )
  ).sort((a, b) => a.localeCompare(b));
}

export async function getQualityByCustomer(
  filters: QualityFilters
): Promise<QualityByCustomerRow[]> {
  const supabase = createClient();

  let query: any = supabase.from("vw_qc_by_customer").select("*");
  query = applyTextFilter(query, "customer", filters.customer);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_qc_by_customer: ${error.message}`);
  }

  return (data ?? []) as QualityByCustomerRow[];
}

export async function getQualityByFactory(
  filters: QualityFilters
): Promise<QualityByFactoryRow[]> {
  const supabase = createClient();

  let query: any = supabase.from("vw_qc_by_factory").select("*");
  query = applyTextFilter(query, "factory", filters.factory);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_qc_by_factory: ${error.message}`);
  }

  return (data ?? []) as QualityByFactoryRow[];
}

export async function getQualityByModel(
  filters: QualityFilters
): Promise<QualityByModelRow[]> {
  const supabase = createClient();

  let query: any = supabase.from("vw_qc_by_model").select("*");
  query = applyTextFilter(query, "style", filters.style);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_qc_by_model: ${error.message}`);
  }

  return (data ?? []) as QualityByModelRow[];
}

export async function getQualityFilterOptions(): Promise<QualityFilterOptions> {
  const supabase = createClient();

  const [
    { data: customerData, error: customerError },
    { data: factoryData, error: factoryError },
    { data: styleData, error: styleError },
  ] = await Promise.all([
    supabase.from("vw_qc_by_customer").select("customer"),
    supabase.from("vw_qc_by_factory").select("factory"),
    supabase.from("vw_qc_by_model").select("style"),
  ]);

  if (customerError) {
    throw new Error(
      `Error loading customer filter options: ${customerError.message}`
    );
  }

  if (factoryError) {
    throw new Error(
      `Error loading factory filter options: ${factoryError.message}`
    );
  }

  if (styleError) {
    throw new Error(
      `Error loading style filter options: ${styleError.message}`
    );
  }

  return {
    customers: uniqueSortedStrings(
      (customerData ?? []).map((row: any) => row.customer)
    ),
    factories: uniqueSortedStrings(
      (factoryData ?? []).map((row: any) => row.factory)
    ),
    styles: uniqueSortedStrings(
      (styleData ?? []).map((row: any) => row.style)
    ),
  };
}

export async function getQualityOverviewData(
  filters: QualityFilters
): Promise<QualityOverviewData> {
  const [customerRows, factoryRows, modelRows] = await Promise.all([
    getQualityByCustomer(filters),
    getQualityByFactory(filters),
    getQualityByModel(filters),
  ]);

  return {
    customerRows,
    factoryRows,
    modelRows,
  };
}