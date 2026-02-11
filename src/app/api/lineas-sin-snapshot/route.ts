// src/app/api/lineas-sin-snapshot/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/lineas-sin-snapshot?limit=200
 * Devuelve líneas de pedido donde master_price_id_used is null,
 * con info del PO + la propia línea para poder diagnosticar.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit");
    let limit = 200;
    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) limit = Math.floor(n);
    }
    if (limit < 1) limit = 1;
    if (limit > 1000) limit = 1000;

    const { data, error } = await supabase
      .from("lineas_pedido")
      .select(
        `
        id,
        po_id,
        reference,
        style,
        color,
        qty,
        price,
        price_selling,
        modelo_id,
        variante_id,
        master_price_id_used,
        pos:pos (
          id,
          po,
          season,
          supplier,
          customer,
          factory,
          po_date
        )
      `
      )
      .is("master_price_id_used", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data || [], limit });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
