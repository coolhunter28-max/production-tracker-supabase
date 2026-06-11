import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
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

    if (error) {
      console.error("[PO_CATALOG]", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const rows =
      data?.flatMap((modelo: any) =>
        (modelo.modelo_variantes ?? []).map((variante: any) => {
          const price = variante.modelo_precios?.[0] ?? null;

          return {
            modelo_id: modelo.id,
            variante_id: variante.id,

            customer: modelo.customer,
            supplier: modelo.supplier,
            factory: modelo.factory,

            style: modelo.style,

            reference:
              variante.reference ||
              modelo.reference,

            season: variante.season,
            color: variante.color,

            size_range: modelo.size_range,

            price_id: price?.id ?? null,
            currency: price?.currency ?? null,
            buy_price: price?.buy_price ?? null,
            sell_price: price?.sell_price ?? null,
            valid_from: price?.valid_from ?? null,
          };
        })
      ) ?? [];

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("[PO_CATALOG_FATAL]", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}