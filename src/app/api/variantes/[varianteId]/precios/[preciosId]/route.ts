// src/app/api/variantes/[varianteId]/precios/[precioId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumberOrNull(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  try {
    const { varianteId, precioId } = params;
    if (!varianteId || !precioId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .select("*")
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  try {
    const { varianteId, precioId } = params;
    if (!varianteId || !precioId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const body = await req.json();

    // whitelist
    const allowed = ["season", "currency", "buy_price", "sell_price", "valid_from", "notes"] as const;

    const updates: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k] === "" ? null : body[k];
    }

    // normalizaciones
    if (updates.buy_price !== undefined) {
      const buy = toNumberOrNull(updates.buy_price);
      if (buy === null) {
        return NextResponse.json({ error: "buy_price must be numeric" }, { status: 400 });
      }
      updates.buy_price = buy;
    }

    if (updates.sell_price !== undefined) {
      updates.sell_price = toNumberOrNull(updates.sell_price);
    }

    if (updates.season !== undefined) updates.season = String(updates.season || "").trim() || null;
    if (updates.currency !== undefined) updates.currency = String(updates.currency || "EUR").trim() || "EUR";

    if (updates.valid_from !== undefined && updates.valid_from !== null) {
      // debe venir como "YYYY-MM-DD"
      const vf = String(updates.valid_from).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vf)) {
        return NextResponse.json({ error: "valid_from must be YYYY-MM-DD" }, { status: 400 });
      }
      updates.valid_from = vf;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .update(updates)
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", precio: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  try {
    const { varianteId, precioId } = params;
    if (!varianteId || !precioId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .delete()
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", deleted: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
