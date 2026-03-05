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

function todayISODate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(
  _req: Request,
  { params }: { params: { cotizacionId: string } }
) {
  try {
    const cotizacionId = params.cotizacionId;
    if (!cotizacionId) {
      return NextResponse.json({ error: "cotizacionId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("cotizaciones")
      .select(
        `
        *,
        modelos: modelos (
          id,
          style,
          reference,
          customer,
          supplier,
          factory,
          status
        ),
        modelo_variantes: modelo_variantes (
          id,
          season,
          color,
          reference,
          factory,
          status
        )
      `
      )
      .eq("id", cotizacionId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { cotizacionId: string } }
) {
  try {
    const cotizacionId = params.cotizacionId;
    if (!cotizacionId) {
      return NextResponse.json({ error: "cotizacionId is required" }, { status: 400 });
    }

    const body = await req.json();

    // editables en cotización
    const status = body?.status !== undefined ? String(body.status || "").trim() : undefined;
    const notes = body?.notes !== undefined ? (body.notes === "" ? null : body.notes ?? null) : undefined;

    const buy_price = body?.buy_price !== undefined ? toNumberOrNull(body.buy_price) : undefined;
    const sell_price = body?.sell_price !== undefined ? toNumberOrNull(body.sell_price) : undefined;
    const currency = body?.currency !== undefined ? String(body.currency || "").trim() : undefined;

    // opcional: promover a master (solo si status=aceptada)
    const promote_to_master = Boolean(body?.promote_to_master ?? false);
    const valid_from = String(body?.valid_from || "").trim() || todayISODate();

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (buy_price !== undefined) {
      if (buy_price === null || buy_price < 0) {
        return NextResponse.json({ error: "buy_price must be numeric and >= 0" }, { status: 400 });
      }
      updates.buy_price = buy_price;
    }
    if (sell_price !== undefined) {
      if (sell_price === null || sell_price < 0) {
        return NextResponse.json({ error: "sell_price must be numeric and >= 0" }, { status: 400 });
      }
      updates.sell_price = sell_price;
    }
    if (currency !== undefined) {
      updates.currency = currency || "USD";
    }

    // si no hay updates y no promovemos, fuera
    if (Object.keys(updates).length === 0 && !promote_to_master) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // 1) actualizar (si hay cambios)
    let cot: any = null;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("cotizaciones")
        .update(updates)
        .eq("id", cotizacionId)
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      cot = data;
    } else {
      // solo promover: cargar cotización
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .eq("id", cotizacionId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      cot = data;
    }

    // 2) promover a master si aplica
    const finalStatus = String(cot?.status || "").trim().toLowerCase();
    if (promote_to_master && finalStatus === "aceptada") {
      const variante_id = String(cot?.variante_id || "").trim();
      if (!variante_id) return NextResponse.json({ error: "cotizacion missing variante_id" }, { status: 500 });

      // cargar variante para modelo_id + season
      const { data: variante, error: vErr } = await supabase
        .from("modelo_variantes")
        .select("id, modelo_id, season")
        .eq("id", variante_id)
        .single();

      if (vErr || !variante) {
        return NextResponse.json({ error: "Variante no existe" }, { status: 404 });
      }

      const payload = {
        modelo_id: variante.modelo_id,
        variante_id,
        season: String(variante.season || "").trim(),
        currency: String(cot?.currency || "USD").trim() || "USD",
        buy_price: cot.buy_price,
        sell_price: cot.sell_price,
        valid_from,
        notes: [
          `from_cotizacion=${cotizacionId}`,
          cot?.created_by ? `created_by=${String(cot.created_by).trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };

      const { data: master, error: mErr } = await supabase
        .from("modelo_precios")
        .upsert([payload], { onConflict: "variante_id,valid_from" })
        .select("*")
        .single();

      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

      return NextResponse.json({ status: "ok", cotizacion: cot, master });
    }

    return NextResponse.json({ status: "ok", cotizacion: cot });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}