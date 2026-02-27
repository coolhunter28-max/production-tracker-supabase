import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/cotizaciones/:cotizacionId/duplicate
// body opcional: { created_by?: string, status?: string }
export async function POST(
  req: Request,
  { params }: { params: { cotizacionId: string } }
) {
  try {
    const cotizacionId = params.cotizacionId;
    if (!cotizacionId) {
      return NextResponse.json({ error: "cotizacionId is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));

    // 1) Cargar cotización original
    const { data: original, error: oErr } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("id", cotizacionId)
      .single();

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
    if (!original) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    // 2) Construir duplicado
    // ✅ notas vacías
    // ✅ status por defecto "enviada" (o el que mandes)
    const newStatus = String(body?.status || "enviada").trim() || "enviada";
    const createdBy =
      body?.created_by !== undefined
        ? String(body.created_by || "").trim() || null
        : (original.created_by ? String(original.created_by).trim() : null);

    const payload: any = {
      modelo_id: original.modelo_id,
      variante_id: original.variante_id,
      currency: original.currency || "USD",

      buy_price: original.buy_price,
      sell_price: original.sell_price,
      margin_pct: original.margin_pct,

      commission_enabled: original.commission_enabled,
      commission_rate: original.commission_rate,
      rounding_step: original.rounding_step,

      status: newStatus,
      notes: null, // ✅ vacío
      created_by: createdBy,
      // created_at lo pone la BD
    };

    // 3) Insert nuevo
    const { data: created, error: cErr } = await supabase
      .from("cotizaciones")
      .insert([payload])
      .select("*")
      .single();

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    return NextResponse.json({ status: "ok", cotizacion: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}