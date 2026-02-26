import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumberOrNull(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// GET /api/cotizaciones?variante_id=...&modelo_id=...&limit=20
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const variante_id = String(searchParams.get("variante_id") || "").trim();
    const modelo_id = String(searchParams.get("modelo_id") || "").trim();

    const limitRaw = searchParams.get("limit");
    let limit = 20;
    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) limit = Math.floor(n);
    }
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;

    let query = supabase
      .from("cotizaciones")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (variante_id) query = query.eq("variante_id", variante_id);
    if (modelo_id) query = query.eq("modelo_id", modelo_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// POST /api/cotizaciones
// body: { variante_id, modelo_id?, currency, buy_price, sell_price, margin_pct?, commission_enabled?, commission_rate?, rounding_step?, status?, notes?, created_by? }
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const variante_id = String(body?.variante_id || "").trim();
    if (!variante_id) {
      return NextResponse.json({ error: "variante_id is required" }, { status: 400 });
    }

    const modelo_id = body?.modelo_id ? String(body.modelo_id).trim() : null;

    const currency = String(body?.currency || "USD").trim() || "USD";

    const buy_price = toNumberOrNull(body?.buy_price);
    const sell_price = toNumberOrNull(body?.sell_price);
    if (buy_price === null || buy_price < 0) {
      return NextResponse.json({ error: "buy_price is required and must be >= 0" }, { status: 400 });
    }
    if (sell_price === null || sell_price < 0) {
      return NextResponse.json({ error: "sell_price is required and must be >= 0" }, { status: 400 });
    }

    const margin_pct = toNumberOrNull(body?.margin_pct); // decimal (0.25)
    const commission_enabled = Boolean(body?.commission_enabled ?? false);
    const commission_rate = toNumberOrNull(body?.commission_rate); // decimal (0.10)
    const rounding_step = toNumberOrNull(body?.rounding_step);

    const status = String(body?.status || "enviada").trim() || "enviada";
    const notes = body?.notes === "" ? null : body?.notes ?? null;
    const created_by = body?.created_by ? String(body.created_by).trim() : null;

    const payload: any = {
      variante_id,
      modelo_id,
      currency,
      buy_price,
      sell_price,
      margin_pct,
      commission_enabled,
      commission_rate,
      rounding_step,
      status,
      notes,
      created_by,
    };

    const { data, error } = await supabase
      .from("cotizaciones")
      .insert([payload])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", cotizacion: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}