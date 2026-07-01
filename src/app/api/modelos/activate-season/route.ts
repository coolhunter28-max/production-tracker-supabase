import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const access = await getCurrentUserAccess();

    if (!access.userId || !access.isActive) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const modeloId = String(body.modelo_id ?? "").trim();
    const sourceSeason = String(body.source_season ?? "").trim();
    const targetSeason = String(body.target_season ?? "").trim();

    if (!modeloId || !sourceSeason || !targetSeason) {
      return NextResponse.json(
        { success: false, error: "modelo_id, source_season y target_season son obligatorios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "activate_model_season_from_existing_season",
      {
        p_modelo_id: modeloId,
        p_source_season: sourceSeason,
        p_target_season: targetSeason,
      }
    );

    if (error) {
      console.error("[ACTIVATE_MODEL_SEASON]", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[ACTIVATE_MODEL_SEASON_FATAL]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}