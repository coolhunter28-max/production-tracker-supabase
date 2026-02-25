import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/variantes?modelo_id=UUID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const modelo_id = String(searchParams.get("modelo_id") || "").trim();

    if (!modelo_id) {
      return NextResponse.json({ error: "modelo_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color, factory, status, notes, created_at, updated_at")
      .eq("modelo_id", modelo_id)
      .order("season", { ascending: false })
      .order("color", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}