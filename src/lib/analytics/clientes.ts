import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CustomerBusinessDetail,
  CustomerBusinessFilterOptions,
  CustomerBusinessKPISet,
  CustomerBusinessMatrixFilters,
  CustomerBusinessMatrixRow,
  CustomerBusinessProfile,
  CustomerBusinessMatrixSort,
  CustomerDevelopmentDetail,
  CustomerDetailBundle,
  CustomerOperationalDetail,
  CustomerQualityDetail,
  CustomerXiamenVolumeEvolutionRow,
  CustomerLatestXiamenVolumeSignal,
} from "@/types/clientes";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

function readParam(
  searchParams: SearchParamsInput,
  key: string
): string | undefined {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }

  const raw = searchParams[key];

  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw ?? undefined;
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isValidSort(value: string): value is CustomerBusinessMatrixSort {
  return [
    "business_score.desc",
    "business_score.asc",
    "friction_score.desc",
    "friction_score.asc",
    "customer.asc",
    "customer.desc",
  ].includes(value);
}

function isValidProfile(value: string): value is CustomerBusinessProfile {
  return [
    "STRATEGIC",
    "PROFITABLE",
    "NEGOTIATOR",
    "RISKY",
    "LOW_VALUE",
  ].includes(value);
}

export function parseClientesSearchParams(
  searchParams: SearchParamsInput
): CustomerBusinessMatrixFilters {
  const customer = normalizeText(readParam(searchParams, "customer"));
  const profileRaw = normalizeText(readParam(searchParams, "profile"));
  const sortRaw = normalizeText(readParam(searchParams, "sort"));

  return {
    customer,
    profile: isValidProfile(profileRaw) ? profileRaw : "",
    sort: isValidSort(sortRaw) ? sortRaw : "business_score.desc",
  };
}

function applySort(
  query: ReturnType<SupabaseClient["from"]>,
  sort: CustomerBusinessMatrixSort
) {
  switch (sort) {
    case "business_score.asc":
      return query.order("customer_business_score", {
        ascending: true,
        nullsFirst: false,
      });

    case "friction_score.desc":
      return query.order("customer_friction_score", {
        ascending: false,
        nullsFirst: false,
      });

    case "friction_score.asc":
      return query.order("customer_friction_score", {
        ascending: true,
        nullsFirst: false,
      });

    case "customer.asc":
      return query.order("customer", {
        ascending: true,
      });

    case "customer.desc":
      return query.order("customer", {
        ascending: false,
      });

    case "business_score.desc":
    default:
      return query.order("customer_business_score", {
        ascending: false,
        nullsFirst: false,
      });
  }
}

export async function getCustomerBusinessMatrix(
  supabase: SupabaseClient,
  filters: CustomerBusinessMatrixFilters
): Promise<CustomerBusinessMatrixRow[]> {
  let query = supabase
    .from("vw_customer_business_matrix")
    .select(
      "customer, customer_business_profile, customer_business_score, customer_friction_score"
    );

  if (filters.customer) {
    query = query.eq("customer", filters.customer);
  }

  if (filters.profile) {
    query = query.eq("customer_business_profile", filters.profile);
  }

  query = applySort(query, filters.sort);

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Error cargando vw_customer_business_matrix: ${error.message}`
    );
  }

  return (data ?? []) as CustomerBusinessMatrixRow[];
}

export async function getCustomerBusinessDetail(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerBusinessDetail | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_customer_business_matrix")
    .select(
      "customer, customer_business_profile, customer_business_score, customer_friction_score"
    )
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error cargando detalle de vw_customer_business_matrix: ${error.message}`
    );
  }

  return (data ?? null) as CustomerBusinessDetail | null;
}

export async function getCustomerOperationalDetail(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerOperationalDetail | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_exec_customer_ranking")
    .select("*")
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error cargando vw_exec_customer_ranking: ${error.message}`
    );
  }

  return (data ?? null) as CustomerOperationalDetail | null;
}

export async function getCustomerDevelopmentDetail(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerDevelopmentDetail | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_dev_customer_negotiation_score")
    .select("*")
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error cargando vw_dev_customer_negotiation_score: ${error.message}`
    );
  }

  return (data ?? null) as CustomerDevelopmentDetail | null;
}

export async function getCustomerQualityDetail(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerQualityDetail | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_qc_by_customer")
    .select("*")
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(`Error cargando vw_qc_by_customer: ${error.message}`);
  }

  return (data ?? null) as CustomerQualityDetail | null;
}
export async function getCustomerXiamenVolumeEvolution(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerXiamenVolumeEvolutionRow[]> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return [];
  }

  const { data, error } = await supabase
    .from("vw_xiamen_customer_season_volume_evolution")
    .select("*")
    .eq("customer", normalizedCustomer)
    .order("season", { ascending: true });

  if (error) {
    throw new Error(
      `Error cargando vw_xiamen_customer_season_volume_evolution: ${error.message}`
    );
  }

  return (data ?? []) as CustomerXiamenVolumeEvolutionRow[];
}
export async function getLatestXiamenVolumeSignals(
  supabase: SupabaseClient
): Promise<Record<string, CustomerLatestXiamenVolumeSignal>> {
  const { data, error } = await supabase
    .from("vw_xiamen_customer_season_volume_evolution")
    .select(
      "customer, season, previous_season, qty_growth_pct, sell_growth_pct, volume_signal"
    )
    .order("customer", { ascending: true })
    .order("season", { ascending: false });

  if (error) {
    throw new Error(
      `Error cargando latest xiamen volume signals: ${error.message}`
    );
  }

  const map: Record<string, CustomerLatestXiamenVolumeSignal> = {};

  for (const row of data ?? []) {
    if (!map[row.customer]) {
      map[row.customer] = row as CustomerLatestXiamenVolumeSignal;
    }
  }

  return map;
}
export async function getCustomerDetailBundle(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerDetailBundle> {
  const [business, operations, development, quality, xiamenVolumeEvolution] =
    await Promise.all([
      getCustomerBusinessDetail(supabase, customer),
      getCustomerOperationalDetail(supabase, customer),
      getCustomerDevelopmentDetail(supabase, customer),
      getCustomerQualityDetail(supabase, customer),
      getCustomerXiamenVolumeEvolution(supabase, customer),
    ]);

  return {
    business,
    operations,
    development,
    quality,
    xiamenVolumeEvolution,
  };
}

export function getCustomerBusinessFilterOptions(
  rows: CustomerBusinessMatrixRow[]
): CustomerBusinessFilterOptions {
  const customers = Array.from(
    new Set(
      rows
        .map((row) => row.customer)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

  const profileOrder: CustomerBusinessProfile[] = [
    "STRATEGIC",
    "PROFITABLE",
    "NEGOTIATOR",
    "RISKY",
    "LOW_VALUE",
  ];

  const profileSet = new Set<CustomerBusinessProfile>();

  for (const row of rows) {
    if (
      row.customer_business_profile &&
      isValidProfile(row.customer_business_profile)
    ) {
      profileSet.add(row.customer_business_profile);
    }
  }

  const profiles = profileOrder.filter((profile) => profileSet.has(profile));

  return {
    customers,
    profiles,
  };
}

function average(values: Array<number | null | undefined>): number {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && !Number.isNaN(value)
  );

  if (valid.length === 0) {
    return 0;
  }

  const total = valid.reduce((sum, value) => sum + value, 0);
  return total / valid.length;
}

export function buildCustomerBusinessKPIs(
  rows: CustomerBusinessMatrixRow[]
): CustomerBusinessKPISet {
  return {
    totalCustomers: rows.length,
    strategicCustomers: rows.filter(
      (row) => row.customer_business_profile === "STRATEGIC"
    ).length,
    profitableCustomers: rows.filter(
      (row) => row.customer_business_profile === "PROFITABLE"
    ).length,
    riskyCustomers: rows.filter(
      (row) => row.customer_business_profile === "RISKY"
    ).length,
    avgBusinessScore: average(rows.map((row) => row.customer_business_score)),
    avgFrictionScore: average(rows.map((row) => row.customer_friction_score)),
  };
}
export async function getCustomerHealthSignals(supabase: any) {
  const { data, error } = await supabase
    .from("vw_customer_health_signal")
    .select("customer, health_signal, volume_signal");

  if (error) {
    throw new Error(`Error cargando health signals: ${error.message}`);
  }

  const map: Record<
    string,
    { health_signal: string; volume_signal: string | null }
  > = {};

  for (const row of data ?? []) {
    map[row.customer] = {
      health_signal: row.health_signal,
      volume_signal: row.volume_signal,
    };
  }

  return map;
}