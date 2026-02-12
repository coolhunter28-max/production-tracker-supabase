import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/modelos/:id/variantes?season=18FW26
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modeloId = params.id;
    const { searchParams } = new URL(req.url);
    const season = String(searchParams.get("season") || "").trim();

    if (!modeloId) {
      return NextResponse.json({ error: "id (modeloId) is required" }, { status: 400 });
    }
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color, reference, factory, status")
      .eq("modelo_id", modeloId)
      .eq("season", season)
      .order("color", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
