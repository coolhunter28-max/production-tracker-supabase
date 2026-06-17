// src/app/api/master/variante-precio/route.ts
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

    const variante_id = norm(searchParams.get("variante_id"));
    const season = norm(searchParams.get("season"));
    const base_date_raw = norm(searchParams.get("base_date"));

    if (!variante_id || !season) {
      return NextResponse.json(
        { error: "Missing variante_id/season" },
        { status: 400 }
      );
    }

    const baseDate =
      base_date_raw && /^\d{4}-\d{2}-\d{2}$/.test(base_date_raw)
        ? base_date_raw
        : new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("modelo_precios")
      .select("*")
      .eq("variante_id", variante_id)
      .eq("season", season)
      .lte("valid_from", baseDate)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      price: data ?? null,
      source: data ? "past_latest" : "none",
      baseDate,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "variante-precio failed";

    console.error("❌ variante-precio error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}