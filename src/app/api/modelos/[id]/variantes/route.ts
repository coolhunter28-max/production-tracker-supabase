import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modeloId = params.id;
    if (!modeloId) {
      return NextResponse.json({ error: "modelo id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("*")
      .eq("modelo_id", modeloId)
      .order("season", { ascending: false })
      .order("color", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modeloId = params.id;
    if (!modeloId) {
      return NextResponse.json({ error: "modelo id is required" }, { status: 400 });
    }

    const body = await req.json();

    const season = String(body?.season || "").trim();
    const color = String(body?.color || "").trim();
    const factory = body?.factory !== undefined ? String(body.factory || "").trim() : null;
    const status = body?.status ? String(body.status).trim() : "activo";
    const notes = body?.notes !== undefined ? String(body.notes || "").trim() : null;

    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }
    if (!color) {
      return NextResponse.json({ error: "color is required" }, { status: 400 });
    }

    // (Opcional) Validar que el modelo exista
    const { data: modelo, error: mErr } = await supabase
      .from("modelos")
      .select("id")
      .eq("id", modeloId)
      .single();

    if (mErr || !modelo) {
      return NextResponse.json({ error: "Modelo no existe" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .insert([
        {
          modelo_id: modeloId,
          season,
          color,
          factory: factory || null,
          status,
          notes: notes || null,
        },
      ])
      .select("*")
      .single();

    if (error) {
      // aquí caerá si ya existe (modelo_id, season, color)
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", variante: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
