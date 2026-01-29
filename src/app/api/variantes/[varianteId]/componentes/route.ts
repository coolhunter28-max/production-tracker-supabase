import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_KINDS = [
  "upper",
  "lining",
  "insole",
  "shoelace",
  "outsole",
  "packaging",
  "other",
] as const;

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json(
        { error: "varianteId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("modelo_componentes")
      .select(
        `
        id,
        modelo_id,
        variante_id,
        kind,
        slot,
        catalogo_id,
        percentage,
        quality,
        material_text,
        extra,
        created_at
      `
      )
      .eq("variante_id", varianteId)
      .order("kind", { ascending: true })
      .order("slot", { ascending: true });

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
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json(
        { error: "varianteId is required" },
        { status: 400 }
      );
    }

    // 1) Cargar variante para obtener modelo_id
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color")
      .eq("id", varianteId)
      .single();

    if (vErr || !variante) {
      return NextResponse.json(
        { error: "Variante no existe" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const kind = String(body?.kind || "").trim();
    const slotRaw = body?.slot;
    const slot = slotRaw === undefined || slotRaw === null ? 1 : Number(slotRaw);

    if (!kind || !ALLOWED_KINDS.includes(kind as any)) {
      return NextResponse.json(
        { error: `kind inválido. Usa: ${ALLOWED_KINDS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Number.isFinite(slot) || slot < 1) {
      return NextResponse.json(
        { error: "slot must be a number >= 1" },
        { status: 400 }
      );
    }

    const payload = {
      modelo_id: variante.modelo_id,
      variante_id: varianteId,
      kind,
      slot,
      catalogo_id: body?.catalogo_id ?? null,
      percentage:
        body?.percentage === "" || body?.percentage === undefined
          ? null
          : Number(body.percentage),
      quality: body?.quality === "" ? null : body?.quality ?? null,
      material_text: body?.material_text === "" ? null : body?.material_text ?? null,
      extra: body?.extra === "" ? null : body?.extra ?? null,
    };

    // Normalizar NaN en percentage
    if (payload.percentage !== null && !Number.isFinite(payload.percentage as any)) {
      return NextResponse.json(
        { error: "percentage debe ser numérico" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("modelo_componentes")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      // aquí puede caer por unique (variante_id, kind, slot)
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", componente: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
