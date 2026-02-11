// src/app/api/master/resolve-variante/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function norm(s: string | null) {
  return (s ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const modelo_id = norm(searchParams.get("modelo_id"));
    const season = norm(searchParams.get("season"));
    const color = norm(searchParams.get("color"));
    const reference = norm(searchParams.get("reference")); // <-- NUEVO

    if (!modelo_id || !season || !color) {
      return NextResponse.json(
        { error: "Missing modelo_id/season/color" },
        { status: 400 }
      );
    }

    // 1) Intento exacto por modelo+season+color+reference (reference puede ser '')
    const q1 = supabase
      .from("modelo_variantes")
      .select("*")
      .eq("modelo_id", modelo_id)
      .eq("season", season)
      .ilike("color", color) // tu color suele ser exacto, pero dejo ilike por seguridad
      .eq("reference", reference || ""); // si no viene, buscamos '' (normalizado)

    const { data: exact, error: e1 } = await q1.limit(1).maybeSingle();
    if (e1) throw e1;

    if (exact) {
      return NextResponse.json({ variante: exact, match: "modelo+season+color+reference" });
    }

    // 2) Fallback: si no hay por reference, probamos sin reference (por si hay variantes antiguas sin ref)
    const { data: fallback, error: e2 } = await supabase
      .from("modelo_variantes")
      .select("*")
      .eq("modelo_id", modelo_id)
      .eq("season", season)
      .ilike("color", color)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e2) throw e2;

    return NextResponse.json({
      variante: fallback || null,
      match: fallback ? "modelo+season+color (fallback)" : "none",
    });
  } catch (err: any) {
    console.error("❌ resolve-variante error:", err);
    return NextResponse.json(
      { error: err?.message || "resolve-variante failed" },
      { status: 500 }
    );
  }
}
