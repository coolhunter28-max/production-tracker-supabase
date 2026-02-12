import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/master/precio?varianteId=...&season=18FW26&baseDate=2026-02-10
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const varianteId = String(searchParams.get("varianteId") || "").trim();
    const season = String(searchParams.get("season") || "").trim();
    const baseDate = String(searchParams.get("baseDate") || "").trim();

    if (!varianteId) return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    if (!season) return NextResponse.json({ error: "season is required" }, { status: 400 });
    if (!baseDate) return NextResponse.json({ error: "baseDate is required (yyyy-mm-dd)" }, { status: 400 });

    const { data, error } = await supabase
      .from("modelo_precios")
      .select("id, variante_id, season, currency, buy_price, sell_price, valid_from, notes")
      .eq("variante_id", varianteId)
      .eq("season", season)
      .lte("valid_from", baseDate)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
