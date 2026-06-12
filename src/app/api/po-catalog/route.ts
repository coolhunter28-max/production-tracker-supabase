import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort();
}

export async function GET() {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess();

    if (!access.userId || !access.isActive) {
      return NextResponse.json({ success: true, data: [], meta: { categories: [], channels: [] } });
    }

    if (!access.canSeeAllCustomers && access.customers.length === 0) {
      return NextResponse.json({ success: true, data: [], meta: { categories: [], channels: [] } });
    }

    let modelosQuery = supabase
      .from("modelos")
      .select(`
        id,
        customer,
        supplier,
        factory,
        style,
        reference,
        size_range,
        modelo_variantes (
          id,
          season,
          color,
          reference,
          modelo_precios (
            id,
            currency,
            buy_price,
            sell_price,
            valid_from
          )
        )
      `)
      .order("customer")
      .order("style");

    if (!access.canSeeAllCustomers) {
      modelosQuery = modelosQuery.in("customer", access.customers);
    }

    const { data, error } = await modelosQuery;

    if (error) {
      console.error("[PO_CATALOG]", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rows =
      data?.flatMap((modelo: any) =>
        (modelo.modelo_variantes ?? []).map((variante: any) => {
          const price = variante.modelo_precios?.[0] ?? null;

          return {
            modelo_id: modelo.id,
            variante_id: variante.id,
            price_id: price?.id ?? null,

            customer: modelo.customer,
            supplier: modelo.supplier,
            factory: modelo.factory,

            style: modelo.style,
            reference: variante.reference || modelo.reference,

            season: variante.season,
            color: variante.color,
            size_range: modelo.size_range,

            currency: price?.currency ?? null,
            buy_price: price?.buy_price ?? null,
            sell_price: price?.sell_price ?? null,
            valid_from: price?.valid_from ?? null,
          };
        })
      ) ?? [];

    const { data: lineMeta } = await supabase
      .from("lineas_pedido")
      .select("category, channel")
      .limit(5000);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        categories: unique((lineMeta ?? []).map((row: any) => row.category)),
        channels: unique((lineMeta ?? []).map((row: any) => row.channel)),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    console.error("[PO_CATALOG_FATAL]", error);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}