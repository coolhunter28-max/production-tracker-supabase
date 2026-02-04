// src/app/api/master/resolve-variante/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/master/resolve-variante?modelo_id=...&season=...&color=...
 * Devuelve:
 *  - { found: true, variante_id: "..." }
 *  - { found: false, variante_id: null }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const modeloId = String(searchParams.get("modelo_id") || "").trim();
    const season = String(searchParams.get("season") || "").trim();
    const color = String(searchParams.get("color") || "").trim();

    if (!modeloId) {
      return NextResponse.json({ error: "modelo_id is required" }, { status: 400 });
    }
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }
    if (!color) {
      return NextResponse.json({ error: "color is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("id")
      .eq("modelo_id", modeloId)
      .eq("season", season)
      .eq("color", color)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const varianteId = data?.[0]?.id ?? null;

    return NextResponse.json({
      found: Boolean(varianteId),
      variante_id: varianteId
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
