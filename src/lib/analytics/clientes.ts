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
  CustomerCommercialAlert,
} from "@/types/clientes";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams;

export interface CustomerLatestXiamenVolumeSignal {
  customer: string;
  season: string;
  previous_season: string | null;
  qty_growth_pct: number | null;
  sell_growth_pct: number | null;
  volume_signal: string | null;
}

export interface CustomerHealthSignal {
  customer: string;
  health_signal: string | null;
  health_reason?: string | null;
  volume_signal: string | null;
  qty_growth_pct?: number | null;
  sell_growth_pct?: number | null;
  xiamen_context_flag: boolean | null;
}

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
    "CRITICAL_XIAMEN",
    "WATCH_XIAMEN",
    "GROWING_XIAMEN",
    "NEW_OR_UNTRACKED_XIAMEN",
    "DEMANDING_XIAMEN",
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

export async function getCustomerBusinessMatrix(
  supabase: SupabaseClient,
  filters: CustomerBusinessMatrixFilters
): Promise<CustomerBusinessMatrixRow[]> {
  let query = supabase
    .from("vw_customer_business_contextual")
    .select(
      "customer, customer_business_profile:contextual_business_profile, customer_business_score:contextual_business_score, customer_friction_score"
    );

  if (filters.customer) {
    query = query.eq("customer", filters.customer);
  }

  if (filters.profile) {
    query = query.eq("contextual_business_profile", filters.profile);
  }

  switch (filters.sort) {
  case "priority.desc":
    query = query
      .order("health_priority", {
        ascending: true, // 1 = CRITICAL primero
      })
      .order("contextual_business_score", {
        ascending: true, // dentro del grupo
        nullsFirst: false,
      });
    break;

  case "business_score.asc":
    query = query.order("contextual_business_score", {
      ascending: true,
      nullsFirst: false,
    });
    break;

  case "business_score.desc":
    query = query.order("contextual_business_score", {
      ascending: false,
      nullsFirst: false,
    });
    break;

  case "friction_score.asc":
    query = query.order("customer_friction_score", {
      ascending: true,
      nullsFirst: false,
    });
    break;

  case "friction_score.desc":
    query = query.order("customer_friction_score", {
      ascending: false,
      nullsFirst: false,
    });
    break;

  case "customer.asc":
    query = query.order("customer", { ascending: true });
    break;

  case "customer.desc":
    query = query.order("customer", { ascending: false });
    break;

  default:
    query = query
      .order("health_priority", { ascending: true })
      .order("contextual_business_score", {
        ascending: true,
        nullsFirst: false,
      });
    break;
}

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Error cargando vw_customer_business_contextual: ${error.message}`
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

export async function getCustomerBusinessContextualDetail(
  supabase: SupabaseClient,
  customer: string
): Promise<{
  customer: string;
  raw_business_profile: string | null;
  raw_business_score: number | null;
  contextual_business_profile: string | null;
  contextual_business_score: number | null;
  customer_friction_score: number | null;
  score_model: string | null;
  volume_signal: string | null;
  health_signal: string | null;
} | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_customer_business_contextual")
    .select(
      "customer, raw_business_profile, raw_business_score, contextual_business_profile, contextual_business_score, customer_friction_score, score_model, volume_signal, health_signal"
    )
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error cargando vw_customer_business_contextual: ${error.message}`
    );
  }

  return data ?? null;
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
    throw new Error(`Error cargando vw_exec_customer_ranking: ${error.message}`);
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

export async function getCustomerHealthSignals(
  supabase: SupabaseClient
): Promise<Record<string, CustomerHealthSignal>> {
  const { data, error } = await supabase
    .from("vw_customer_health_signal")
    .select(
  "customer, health_signal, health_reason, volume_signal, qty_growth_pct, sell_growth_pct, xiamen_context_flag"
);

  if (error) {
    throw new Error(`Error cargando health signals: ${error.message}`);
  }

  const map: Record<string, CustomerHealthSignal> = {};

  for (const row of data ?? []) {
    map[row.customer] = {
      customer: row.customer,
      health_signal: row.health_signal,
      volume_signal: row.volume_signal,
      xiamen_context_flag: row.xiamen_context_flag,
      health_reason: row.health_reason,
qty_growth_pct: row.qty_growth_pct,
sell_growth_pct: row.sell_growth_pct,
    };
  }

  return map;
}

export async function getCustomerHealthSignal(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerHealthSignal | null> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return null;
  }

  const { data, error } = await supabase
    .from("vw_customer_health_signal")
    .select(
      "customer, health_signal, health_reason, volume_signal, qty_growth_pct, sell_growth_pct, xiamen_context_flag"
    )
    .eq("customer", normalizedCustomer)
    .maybeSingle();

  if (error) {
    throw new Error(`Error cargando customer health signal: ${error.message}`);
  }

  return (data ?? null) as CustomerHealthSignal | null;
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

  const profiles = Array.from(
    new Set(
      rows
        .map((row) => row.customer_business_profile)
        .filter((value): value is CustomerBusinessProfile => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

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
      (row) =>
        row.customer_business_profile === "RISKY" ||
        row.customer_business_profile === "CRITICAL_XIAMEN"
    ).length,
    avgBusinessScore: average(rows.map((row) => row.customer_business_score)),
    avgFrictionScore: average(rows.map((row) => row.customer_friction_score)),
  };
}
export async function getCustomerCommercialAlerts(
  supabase: SupabaseClient,
  filters?: { customer?: string; profile?: string }
): Promise<CustomerCommercialAlert[]> {
  const customer = filters?.customer?.trim() ?? "";
  const profile = filters?.profile?.trim() ?? "";

  let query = supabase.from("vw_customer_commercial_alerts").select("*");

  if (customer) {
    query = query.eq("customer", customer);
  }

  if (profile) {
    query = query.eq("contextual_business_profile", profile);
  }

  const { data, error } = await query
    .order("alert_priority", { ascending: true })
    .order("contextual_business_score", {
      ascending: true,
      nullsFirst: false,
    })
    .order("customer", { ascending: true });

  if (error) {
    console.error("Error loading customer commercial alerts:", error);
    return [];
  }

  return (data ?? []) as CustomerCommercialAlert[];
}

export async function getCustomerCommercialAlertsByCustomer(
  supabase: SupabaseClient,
  customer: string
): Promise<CustomerCommercialAlert[]> {
  const normalizedCustomer = customer.trim();

  if (!normalizedCustomer) {
    return [];
  }

  const { data, error } = await supabase
    .from("vw_customer_commercial_alerts")
    .select("*")
    .eq("customer", normalizedCustomer)
    .order("alert_priority", { ascending: true });

  if (error) {
    console.error("Error loading customer commercial alerts by customer:", error);
    return [];
  }

  return (data ?? []) as CustomerCommercialAlert[];
}