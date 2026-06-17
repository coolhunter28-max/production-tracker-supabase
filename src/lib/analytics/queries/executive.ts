import { createClient } from "@/lib/supabase";
import type {
  ExecutiveCustomerRankingRow,
  ExecutiveDashboardData,
  ExecutiveFactoryRankingRow,
  ExecutiveFilters,
  ExecutiveKPIDashboardRow,
  ExecutiveSeasonRankingRow,
} from "@/lib/analytics/types/executive";

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

function emptyToNull(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function getExecutiveKPIs(
  filters: ExecutiveFilters
): Promise<ExecutiveKPIDashboardRow[]> {
  const supabase = await createClient();

  const season = emptyToNull(filters.season);
  const customer = emptyToNull(filters.customer);
  const factory = emptyToNull(filters.factory);

  const { data, error } = await supabase.rpc("get_exec_summary_v2", {
    p_season: season,
    p_customer: customer,
    p_factory: factory,
  });

  if (error) {
    throw new Error(`Error loading Executive KPIs: ${error.message}`);
  }

  return (data ?? []) as ExecutiveKPIDashboardRow[];
}

export async function getExecutiveCustomerRanking(
  filters: ExecutiveFilters
): Promise<ExecutiveCustomerRankingRow[]> {
  const supabase = await createClient();

  let query: any = supabase.from("vw_exec_customer_ranking").select("*");

  query = applyTextFilter(query, "customer", filters.customer);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_exec_customer_ranking: ${error.message}`);
  }

  return (data ?? []) as ExecutiveCustomerRankingRow[];
}

export async function getExecutiveFactoryRanking(
  filters: ExecutiveFilters
): Promise<ExecutiveFactoryRankingRow[]> {
  const supabase = await createClient();

  let query: any = supabase.from("vw_exec_factory_ranking").select("*");

  query = applyTextFilter(query, "factory", filters.factory);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error loading vw_exec_factory_ranking: ${error.message}`);
  }

  return (data ?? []) as ExecutiveFactoryRankingRow[];
}

export async function getExecutiveSeasonRanking(
  filters: ExecutiveFilters
): Promise<ExecutiveSeasonRankingRow[]> {
  const supabase = await createClient();

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

  return (data ?? []) as ExecutiveSeasonRankingRow[];
}

export async function getExecutiveFilterOptions() {
  const supabase = await createClient();

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
    throw new Error(
      `Error loading customer filter options: ${customerError.message}`
    );
  }

  if (factoryError) {
    throw new Error(
      `Error loading factory filter options: ${factoryError.message}`
    );
  }

  if (seasonError) {
    throw new Error(
      `Error loading season filter options: ${seasonError.message}`
    );
  }

  return {
    customers: uniqueSortedStrings(
      (customerData ?? []).map((row: any) => row.customer)
    ),
    factories: uniqueSortedStrings(
      (factoryData ?? []).map((row: any) => row.factory)
    ),
    seasons: uniqueSortedStrings(
      (seasonData ?? []).map((row: any) => row.season)
    ),
  };
}

export async function getExecutiveDashboardData(
  filters: ExecutiveFilters
): Promise<ExecutiveDashboardData> {
  const [kpis, customerRanking, factoryRanking, seasonRanking] =
    await Promise.all([
      getExecutiveKPIs(filters),
      getExecutiveCustomerRanking(filters),
      getExecutiveFactoryRanking(filters),
      getExecutiveSeasonRanking(filters),
    ]);

  return {
    kpis,
    customerRanking,
    factoryRanking,
    seasonRanking,
  };
}