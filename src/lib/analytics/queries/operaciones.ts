import { createClient } from "@/lib/supabase";
import type {
  OperacionesCustomerRankingRow,
  OperacionesFactoryRankingRow,
  OperacionesFilterOptions,
  OperacionesFilters,
  OperacionesLogisticsPressureRow,
  OperacionesOverviewData,
  OperacionesSeasonRankingRow,
} from "@/lib/analytics/types/operaciones";

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

export async function getOperacionesCustomerRanking(
  filters: OperacionesFilters
): Promise<OperacionesCustomerRankingRow[]> {
  const supabase = createClient();

  let query: any = supabase.from("vw_exec_customer_ranking").select("*");

  query = applyTextFilter(query, "customer", filters.customer);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_exec_customer_ranking: ${error.message}`);
  }

  return (data ?? []) as OperacionesCustomerRankingRow[];
}

export async function getOperacionesFactoryRanking(
  filters: OperacionesFilters
): Promise<OperacionesFactoryRankingRow[]> {
  const supabase = createClient();

  let query: any = supabase.from("vw_exec_factory_ranking").select("*");

  query = applyTextFilter(query, "factory", filters.factory);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_exec_factory_ranking: ${error.message}`);
  }

  return (data ?? []) as OperacionesFactoryRankingRow[];
}

export async function getOperacionesSeasonRanking(
  filters: OperacionesFilters
): Promise<OperacionesSeasonRankingRow[]> {
  const supabase = createClient();

  let query: any = supabase
    .from("vw_exec_season_performance_ranking")
    .select("*");

  query = applyTextFilter(query, "season", filters.season);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Error loading vw_exec_season_performance_ranking: ${error.message}`
    );
  }

  return (data ?? []) as OperacionesSeasonRankingRow[];
}

export async function getOperacionesLogisticsRanking(
  filters: OperacionesFilters
): Promise<OperacionesLogisticsPressureRow[]> {
  const supabase = createClient();

  let query: any = supabase
    .from("vw_exec_customer_logistics_pressure_ranking")
    .select("*");

  query = applyTextFilter(query, "customer", filters.customer);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Error loading vw_exec_customer_logistics_pressure_ranking: ${error.message}`
    );
  }

  return (data ?? []) as OperacionesLogisticsPressureRow[];
}

export async function getOperacionesFilterOptions(): Promise<OperacionesFilterOptions> {
  const supabase = createClient();

  const [
    { data: customerData, error: customerError },
    { data: factoryData, error: factoryError },
    { data: seasonData, error: seasonError },
  ] = await Promise.all([
    supabase.from("vw_exec_customer_ranking").select("customer"),
    supabase.from("vw_exec_factory_ranking").select("factory"),
    supabase.from("vw_exec_season_performance_ranking").select("season"),
  ]);

  if (customerError) {
    throw new Error(`Error loading customer filter options: ${customerError.message}`);
  }

  if (factoryError) {
    throw new Error(`Error loading factory filter options: ${factoryError.message}`);
  }

  if (seasonError) {
    throw new Error(`Error loading season filter options: ${seasonError.message}`);
  }

  return {
    customers: uniqueSortedStrings((customerData ?? []).map((row: any) => row.customer)),
    factories: uniqueSortedStrings((factoryData ?? []).map((row: any) => row.factory)),
    seasons: uniqueSortedStrings((seasonData ?? []).map((row: any) => row.season)),
  };
}

export async function getOperacionesOverviewData(
  filters: OperacionesFilters
): Promise<OperacionesOverviewData> {
  const [customerRanking, factoryRanking, seasonRanking, logisticsRanking] =
    await Promise.all([
      getOperacionesCustomerRanking(filters),
      getOperacionesFactoryRanking(filters),
      getOperacionesSeasonRanking(filters),
      getOperacionesLogisticsRanking(filters),
    ]);

  return {
    customerRanking,
    factoryRanking,
    seasonRanking,
    logisticsRanking,
  };
}