import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/cotizaciones/meta/seasons
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("season")
      .not("season", "is", null)
      .order("season", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const seasons = Array.from(
      new Set((data || []).map((r: any) => String(r.season || "").trim()).filter(Boolean))
    );

    return NextResponse.json({ data: seasons });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}