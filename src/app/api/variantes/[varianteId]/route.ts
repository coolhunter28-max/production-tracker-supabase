import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .select("*")
      .eq("id", varianteId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    const body = await req.json();

    // whitelist (para no liarla)
    const allowed = ["season", "color", "factory", "status", "notes"] as const;

    const updates: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) {
        const v = body[k];
        updates[k] = v === "" ? null : v;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_variantes")
      .update(updates)
      .eq("id", varianteId)
      .select("*")
      .single();

    if (error) {
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

export async function DELETE(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    // ON DELETE CASCADE se encarga de componentes/precios si tienen variante_id
    const { data, error } = await supabase
      .from("modelo_variantes")
      .delete()
      .eq("id", varianteId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", deleted: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
