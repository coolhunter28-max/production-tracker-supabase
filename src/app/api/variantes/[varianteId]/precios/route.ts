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

function todayISODate() {
  // YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json(
        { error: "varianteId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .select(
        `
        id,
        modelo_id,
        variante_id,
        season,
        currency,
        buy_price,
        sell_price,
        valid_from,
        notes,
        created_at,
        updated_at
      `
      )
      .eq("variante_id", varianteId)
      .order("valid_from", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json(
        { error: "varianteId is required" },
        { status: 400 }
      );
    }

    // 1) Cargar variante para obtener modelo_id + season (por defecto)
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season")
      .eq("id", varianteId)
      .single();

    if (vErr || !variante) {
      return NextResponse.json(
        { error: "Variante no existe" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const buy = toNumberOrNull(body?.buy_price);
    if (buy === null) {
      return NextResponse.json(
        { error: "buy_price is required and must be numeric" },
        { status: 400 }
      );
    }

    const sell = toNumberOrNull(body?.sell_price);

    const season = String(body?.season || variante.season || "").trim();
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }

    const currency = String(body?.currency || "EUR").trim() || "EUR";

    // ✅ Opción A: 1 precio por variante y día
    // Si no mandas valid_from -> usamos HOY
    const validFromRaw = String(body?.valid_from || "").trim();
    const valid_from = validFromRaw || todayISODate();

    const notes = body?.notes === "" ? null : body?.notes ?? null;

    const payload = {
      modelo_id: variante.modelo_id,
      variante_id: varianteId,
      season,
      currency,
      buy_price: buy,
      sell_price: sell,
      valid_from,
      notes,
    };

    // 2) UPSERT por (variante_id, valid_from)
    // - Si existe (misma variante y mismo día): UPDATE
    // - Si no existe: INSERT
    const { data, error } = await supabase
      .from("modelo_precios")
      .upsert([payload], { onConflict: "variante_id,valid_from" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", precio: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
