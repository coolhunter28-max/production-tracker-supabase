import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess();

  if (!access.userId || !access.isActive) {
    return NextResponse.json([], { status: 200 });
  }

  if (!access.canSeeAllCustomers && access.customers.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  let query = supabase
    .from("pos")
    .select(
      `
      *,
      lineas_pedido (
        id,
        po_id,
        reference,
        style,
        color,
        size_run,
        category,
        qty,
        price,
        amount,
        pi_number,
        etd,
        pi_bsg,
        price_selling,
        amount_selling,
        muestras (
          id,
          tipo_muestra,
          round,
          estado_muestra,
          fecha_teorica,
          fecha_muestra
        )
      )
    `
    )
    .order("po_date", { ascending: false });

  if (!access.canSeeAllCustomers) {
    query = query.in("customer", access.customers);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/pos]", error);
    return NextResponse.json([], { status: 200 });
  }

  const rows = (data ?? []).map((po) => ({
    ...po,
    estado: po.estado || "Sin datos",
  }));

  return NextResponse.json(rows);
}
