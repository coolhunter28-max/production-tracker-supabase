import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/modelo-imagenes/bulk?variante_ids=id1,id2,id3
// Devuelve: { data: { [variante_id]: public_url } }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = String(searchParams.get("variante_ids") || "").trim();

    if (!raw) return NextResponse.json({ data: {} });

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return NextResponse.json({ data: {} });
    if (ids.length > 300) {
      return NextResponse.json(
        { error: "Too many variante_ids (max 300)" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("modelo_imagenes")
      .select("variante_id, public_url, sort_order, created_at")
      .in("variante_id", ids)
      .not("public_url", "is", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const map: Record<string, string> = {};
    for (const r of data || []) {
      const vid = String((r as any)?.variante_id || "");
      const url = String((r as any)?.public_url || "");
      if (!vid || !url) continue;
      if (!map[vid]) map[vid] = url; // primera gana
    }

    return NextResponse.json({ data: map });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}