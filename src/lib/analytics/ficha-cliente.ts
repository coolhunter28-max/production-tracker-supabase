import { createClient } from "@/lib/supabase";

export type FichaClienteRow = {
  customer: string;
  season: string;
  supplier: string;

  etd_pi: string | null;

  po_id_list: string | null;
  po_list: string | null;

  reference: string | null;
  style: string | null;
  color: string | null;

  qty_total: number | null;

  cfms_status: string | null;
  counters_status: string | null;
  fittings_status: string | null;
  pps_status: string | null;
  testings_status: string | null;
  shippings_status: string | null;

  trial_upper: string | null;
  trial_lasting: string | null;
  lasting: string | null;

  inspection: string | null;

  booking: string | null;
  closing: string | null;
  shipping_date: string | null;
};

export type FichaClienteFilters = {
  customer?: string;
  season?: string;
  supplier?: string;
  style?: string;
};

export async function getFichaClienteRows(
  filters: FichaClienteFilters = {}
): Promise<FichaClienteRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_customer_campaign_board_v1")
    .select("*");

  if (filters.customer) {
    query = query.eq("customer", filters.customer);
  }

  if (filters.season) {
    query = query.eq("season", filters.season);
  }

  if (filters.supplier) {
    query = query.eq("supplier", filters.supplier);
  }

  if (filters.style) {
    query = query.ilike("style", `%${filters.style}%`);
  }

  const { data, error } = await query
    .order("customer")
    .order("etd_pi")
    .order("style");

  if (error) {
    console.error("[getFichaClienteRows]", error);

    return [];
  }

  return (data ?? []) as FichaClienteRow[];
}

export async function getFichaClienteFilters() {
  const supabase = await createClient();

  const [customers, seasons, suppliers] = await Promise.all([
    supabase
      .from("vw_customer_campaign_board_v1")
      .select("customer"),

    supabase
      .from("vw_customer_campaign_board_v1")
      .select("season"),

    supabase
      .from("vw_customer_campaign_board_v1")
      .select("supplier"),
  ]);

  return {
    customers: [
      ...new Set(
        (customers.data ?? [])
          .map((r) => r.customer)
          .filter(Boolean)
      ),
    ].sort(),

    seasons: [
      ...new Set(
        (seasons.data ?? [])
          .map((r) => r.season)
          .filter(Boolean)
      ),
    ].sort(),

    suppliers: [
      ...new Set(
        (suppliers.data ?? [])
          .map((r) => r.supplier)
          .filter(Boolean)
      ),
    ].sort(),
  };
}