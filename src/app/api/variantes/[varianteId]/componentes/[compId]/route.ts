// src/app/api/variantes/[varianteId]/componentes/[compId]/route.ts
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
  { params }: { params: { varianteId: string; compId: string } }
) {
  try {
    const { varianteId, compId } = params;
    if (!varianteId || !compId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_componentes")
      .select("*")
      .eq("id", compId)
      .eq("variante_id", varianteId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Componente no encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { varianteId: string; compId: string } }
) {
  try {
    const { varianteId, compId } = params;
    if (!varianteId || !compId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const body = await req.json();

    // whitelist
    const allowed = [
      "kind",
      "slot",
      "catalogo_id",
      "percentage",
      "quality",
      "material_text",
      "extra",
    ] as const;

    const updates: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) {
        updates[k] = body[k] === "" ? null : body[k];
      }
    }

    // Validaciones mínimas
    if (updates.kind !== undefined) {
      const kind = String(updates.kind).trim();
      if (!ALLOWED_KINDS.includes(kind as any)) {
        return NextResponse.json(
          { error: `kind inválido. Usa: ${ALLOWED_KINDS.join(", ")}` },
          { status: 400 }
        );
      }
      updates.kind = kind;
    }

    if (updates.slot !== undefined) {
      const slot = Number(updates.slot);
      if (!Number.isFinite(slot) || slot < 1) {
        return NextResponse.json({ error: "slot must be a number >= 1" }, { status: 400 });
      }
      updates.slot = slot;
    }

    if (updates.percentage !== undefined && updates.percentage !== null) {
      const p = Number(updates.percentage);
      if (!Number.isFinite(p)) {
        return NextResponse.json({ error: "percentage debe ser numérico" }, { status: 400 });
      }
      updates.percentage = p;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_componentes")
      .update(updates)
      .eq("id", compId)
      .eq("variante_id", varianteId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", componente: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { varianteId: string; compId: string } }
) {
  try {
    const { varianteId, compId } = params;
    if (!varianteId || !compId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_componentes")
      .delete()
      .eq("id", compId)
      .eq("variante_id", varianteId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "ok", deleted: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
