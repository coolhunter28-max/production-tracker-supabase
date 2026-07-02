import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ActivateSeasonResult = {
  created_variantes?: number | null;
  created_componentes?: number | null;
  created_imagenes?: number | null;
  created_precios?: number | null;
};

function firstRpcRow(data: unknown): ActivateSeasonResult {
  if (Array.isArray(data)) {
    return (data[0] ?? {}) as ActivateSeasonResult;
  }

  return (data ?? {}) as ActivateSeasonResult;
}

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

    const result = firstRpcRow(data);

    const { data: userData } = await supabase.auth.getUser();
    const userEmail =
      userData.user?.email ??
      (access as { userEmail?: string; email?: string }).userEmail ??
      (access as { userEmail?: string; email?: string }).email ??
      null;

    const auditPayload = {
      source_season: sourceSeason,
      target_season: targetSeason,
      created_variantes: result.created_variantes ?? 0,
      created_componentes: result.created_componentes ?? 0,
      created_imagenes: result.created_imagenes ?? 0,
      created_precios: result.created_precios ?? 0,
    };

    const { error: auditError } = await supabase.from("modelo_eventos").insert({
      modelo_id: modeloId,
      variante_id: null,
      entity_type: "modelo",
      event_type: "SEASON_ACTIVATED",
      user_id: access.userId,
      user_email: userEmail,
      source: "nuevo_po",
      payload: auditPayload,
    });

    if (auditError) {
      console.error("[ACTIVATE_MODEL_SEASON_AUDIT]", auditError);
    }

    return NextResponse.json({
      success: true,
      data,
      audit: {
        success: !auditError,
        error: auditError?.message ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[ACTIVATE_MODEL_SEASON_FATAL]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
