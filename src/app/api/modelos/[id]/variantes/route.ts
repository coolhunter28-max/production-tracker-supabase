// src/app/api/modelos/[id]/variantes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const modeloId = context.params.id;

    // ✅ season opcional (NUNCA 400 por season)
    const { searchParams } = new URL(req.url);
    const seasonRaw = searchParams.get("season");
    const season = (seasonRaw ?? "").trim();

    if (!modeloId) {
      return NextResponse.json(
        { error: "Missing modelo id" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color, reference, factory, status")
      .eq("modelo_id", modeloId)
      .order("color", { ascending: true });

    // ✅ si viene season, filtramos; si no, devolvemos todas
    if (season) {
      query = query.eq("season", season);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
