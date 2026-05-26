import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type LineaPayload = {
  id?: string;
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  size_run?: string | null;
  category?: string | null;
  channel?: string | null;
  qty?: number | null;
  price?: number | null;
  price_selling?: number | null;
  amount_selling?: number | null;
  pi_bsg?: string | null;
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;
  muestras?: MuestraPayload[];
};

type MuestraPayload = {
  id?: string;
  tipo_muestra?: string | null;
  fecha_muestra?: string | null;
  estado_muestra?: string | null;
  round?: number | null;
  notas?: string | null;
};

function emptyToNull(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function text(value: unknown) {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

function num(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// GET: obtener un PO con líneas + muestras
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { data, error } = await supabase
    .from("pos")
    .select("*, lineas_pedido(*, muestras(*))")
    .eq("id", params.id)
    .single();

  if (error) {
    console.error("❌ Error obteniendo PO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: actualizar PO + líneas + muestras
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const poId = params.id;

    const poPayload = {
      po: text(body.po),
      season: text(body.season),
      customer: text(body.customer),
      supplier: text(body.supplier),
      factory: text(body.factory),
      currency: text(body.currency) ?? "USD",
      po_date: emptyToNull(body.po_date),
      etd_pi: emptyToNull(body.etd_pi),
      booking: emptyToNull(body.booking),
      closing: emptyToNull(body.closing),
      shipping_date: emptyToNull(body.shipping_date),
      inspection: emptyToNull(body.inspection),
      estado_inspeccion: emptyToNull(body.estado_inspeccion),
    };

    const { error: poError } = await supabase
      .from("pos")
      .update(poPayload)
      .eq("id", poId);

    if (poError) {
      throw new Error(poError.message);
    }

    const lineas = Array.isArray(body.lineas_pedido)
      ? (body.lineas_pedido as LineaPayload[])
      : [];

    for (const linea of lineas) {
      if (!linea.id) continue;

      const lineaPayload = {
        reference: text(linea.reference) ?? "",
        style: text(linea.style) ?? "",
        color: text(linea.color) ?? "",
        size_run: text(linea.size_run),
        category: text(linea.category),
        channel: text(linea.channel),
        qty: num(linea.qty),
        price: num(linea.price),
        price_selling: num(linea.price_selling),
        amount_selling: num(linea.amount_selling),
        pi_bsg: emptyToNull(linea.pi_bsg),
        trial_upper: emptyToNull(linea.trial_upper),
        trial_lasting: emptyToNull(linea.trial_lasting),
        lasting: emptyToNull(linea.lasting),
        finish_date: emptyToNull(linea.finish_date),

        // Importante:
        // NO tocamos snapshot master_*_used aquí.
        // NO recalculamos modelo_id / variante_id aquí.
        // Master Sync se encarga de backfill seguro.
      };

      const { error: lineaError } = await supabase
        .from("lineas_pedido")
        .update(lineaPayload)
        .eq("id", linea.id);

      if (lineaError) {
        throw new Error(lineaError.message);
      }

      const muestras = Array.isArray(linea.muestras)
        ? (linea.muestras as MuestraPayload[])
        : [];

      for (const muestra of muestras) {
        if (!muestra.id) continue;

        const muestraPayload = {
          tipo_muestra: text(muestra.tipo_muestra),
          fecha_muestra: emptyToNull(muestra.fecha_muestra),
          estado_muestra: text(muestra.estado_muestra),
          round: num(muestra.round),
          notas: emptyToNull(muestra.notas),
        };

        const { error: muestraError } = await supabase
          .from("muestras")
          .update(muestraPayload)
          .eq("id", muestra.id);

        if (muestraError) {
          throw new Error(muestraError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: {
        po: true,
        lineas: lineas.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error actualizando PO:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error actualizando PO",
      },
      { status: 500 },
    );
  }
}

// DELETE: eliminar un PO
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { data: existing, error: findErr } = await supabase
      .from("pos")
      .select("id, po")
      .eq("id", params.id)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "PO no encontrado" }, { status: 404 });
    }

    const { error } = await supabase.from("pos").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error inesperado" },
      { status: 500 },
    );
  }
}