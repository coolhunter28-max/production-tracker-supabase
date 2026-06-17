// src/app/api/master/resolve-variante/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function norm(value: string | null) {
  return (value ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);

    const modelo_id = norm(searchParams.get("modelo_id"));
    const season = norm(searchParams.get("season"));
    const color = norm(searchParams.get("color"));
    const reference = norm(searchParams.get("reference"));

    if (!modelo_id || !season || !color) {
      return NextResponse.json(
        { error: "Missing modelo_id/season/color" },
        { status: 400 }
      );
    }

    const { data: exact, error: exactError } = await supabase
      .from("modelo_variantes")
      .select("*")
      .eq("modelo_id", modelo_id)
      .eq("season", season)
      .ilike("color", color)
      .eq("reference", reference || "")
      .limit(1)
      .maybeSingle();

    if (exactError) throw exactError;

    if (exact) {
      return NextResponse.json({
        variante: exact,
        match: "modelo+season+color+reference",
      });
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from("modelo_variantes")
      .select("*")
      .eq("modelo_id", modelo_id)
      .eq("season", season)
      .ilike("color", color)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;

    return NextResponse.json({
      variante: fallback ?? null,
      match: fallback ? "modelo+season+color (fallback)" : "none",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "resolve-variante failed";

    console.error("❌ resolve-variante error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}