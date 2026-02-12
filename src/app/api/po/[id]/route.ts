import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// GET: obtener un PO con líneas + muestras
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
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

// Limpia valores "" → null (pero NO toca undefined)
function cleanObject(obj: Record<string, any>) {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue; // no pisar con null si no viene
    cleaned[key] = value === "" ? null : value;
  }
  return cleaned;
}

function normText(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function isXiamenSupplier(supplier: any): boolean {
  const s = String(supplier || "").toUpperCase();
  return s.includes("XIAMEN DIC");
}

// Convierte "18,40" / "9.917,60" / "$9,917.60" -> number
function parseMoneyLike(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s0 = String(v).trim();
  if (!s0) return null;

  let s = s0.replace(/[^\d.,-]/g, "");

  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function ensureModeloId(opts: {
  style: string | null;
  customer: string | null;
  supplier: string | null;
  factory?: string | null;
}) {
  const style = normText(opts.style);
  const customer = normText(opts.customer);
  const supplier = normText(opts.supplier);
  const factory = normText(opts.factory);

  if (!style) return null;

  const { data: found, error: findErr } = await supabase
    .from("modelos")
    .select("id")
    .eq("style", style)
    .eq("customer", customer)
    .eq("supplier", supplier)
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;
  if (found?.id) return found.id as string;

  const { data: created, error: createErr } = await supabase
    .from("modelos")
    .insert({
      style,
      customer,
      supplier,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO edit (style match)",
    })
    .select("id")
    .single();

  if (createErr) throw createErr;
  return created.id as string;
}

async function ensureVarianteId(opts: {
  modelo_id: string | null;
  season: string | null;
  color: string | null;
  reference: string | null;
  factory?: string | null;
}) {
  const modelo_id = opts.modelo_id;
  const season = normText(opts.season);
  const color = normText(opts.color);
  const reference = normText(opts.reference);
  const factory = normText(opts.factory);

  if (!modelo_id || !season) return null;

  let q = supabase
    .from("modelo_variantes")
    .select("id")
    .eq("modelo_id", modelo_id)
    .eq("season", season);

  if (color === null) q = q.is("color", null);
  else q = q.eq("color", color);

  if (reference === null) q = q.is("reference", null);
  else q = q.eq("reference", reference);

  const { data: found, error: findErr } = await q.limit(1).maybeSingle();
  if (findErr) throw findErr;
  if (found?.id) return found.id as string;

  const { data: created, error: createErr } = await supabase
    .from("modelo_variantes")
    .insert({
      modelo_id,
      season,
      color,
      reference,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO edit (by reference)",
    })
    .select("id")
    .single();

  if (!createErr) return created.id as string;

  if (String((createErr as any)?.code || "") === "23505") {
    const { data: again, error: againErr } = await q.limit(1).maybeSingle();
    if (againErr) throw againErr;
    if (again?.id) return again.id as string;
  }

  throw createErr;
}

async function applySnapshotAndMaybeFillPrice(opts: {
  linea_id: string;
  supplier: string | null;
}) {
  const { data: snapRes, error: snapErr } = await supabase.rpc(
    "apply_master_snapshot_for_line",
    { p_linea_id: opts.linea_id }
  );

  if (snapErr) {
    console.error("❌ Error snapshot master (RPC):", snapErr);
    return;
  }
  if ((snapRes as any)?.ok !== true) {
    console.warn("⚠️ Snapshot no aplicado:", snapRes);
    return;
  }

  const { data: linea, error: lineaErr } = await supabase
    .from("lineas_pedido")
    .select("id, price, master_buy_price_used, master_sell_price_used")
    .eq("id", opts.linea_id)
    .single();

  if (lineaErr) {
    console.error("❌ Error leyendo línea tras snapshot:", lineaErr);
    return;
  }

  if (linea?.price !== null && linea?.price !== undefined) return;

  const useSell = isXiamenSupplier(opts.supplier);
  const nextPrice = useSell ? linea?.master_sell_price_used : linea?.master_buy_price_used;
  if (nextPrice === null || nextPrice === undefined) return;

  const { error: updErr } = await supabase
    .from("lineas_pedido")
    .update({ price: nextPrice })
    .eq("id", opts.linea_id);

  if (updErr) console.error("❌ Error rellenando price desde snapshot:", updErr);
}

// PUT: actualizar PO + líneas + muestras
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  try {
    const poData: Record<string, any> = cleanObject({
      season: body.season,
      po: body.po,
      customer: body.customer,
      supplier: body.supplier,
      factory: body.factory,
      po_date: body.po_date,
      etd_pi: body.etd_pi,
      booking: body.booking,
      closing: body.closing,
      shipping_date: body.shipping_date,
      inspection: body.inspection,
      estado_inspeccion: body.estado_inspeccion,
      currency: body.currency || "USD",
      pi: body.pi ?? null,
      channel: body.channel ?? undefined,
    });

    const { error: poError } = await supabase
      .from("pos")
      .update(poData)
      .eq("id", params.id);

    if (poError) throw poError;

    const poSeason = normText(body.season);
    const poCustomer = normText(body.customer);
    const poSupplier = normText(body.supplier);
    const poFactory = normText(body.factory);

    if (Array.isArray(body.lineas_pedido)) {
      for (const linea of body.lineas_pedido) {
        const { id: lineaId, muestras, ...lineaData } = linea;

        // 🔒 Normaliza BSG + numericos si vienen
        const normalizedLinea = {
          ...lineaData,

          // BSG
          price_selling:
            lineaData.price_selling !== undefined
              ? parseMoneyLike(lineaData.price_selling)
              : undefined,
          amount_selling:
            lineaData.amount_selling !== undefined
              ? parseMoneyLike(lineaData.amount_selling)
              : undefined,
          pi_bsg: lineaData.pi_bsg !== undefined ? lineaData.pi_bsg : undefined,

          // Coste / amount (por si viene en string desde UI)
          price:
            lineaData.price !== undefined ? parseMoneyLike(lineaData.price) : undefined,
          amount:
            lineaData.amount !== undefined ? parseMoneyLike(lineaData.amount) : undefined,
        };

        const cleanLinea = cleanObject(normalizedLinea);
        let lineaIdReal = lineaId;

        // ✅ Autofill modelo_id + variante_id (si hay style)
        const style = normText(lineaData?.style);
        const color = normText(lineaData?.color);
        const reference = normText(lineaData?.reference);

        let modeloId = cleanLinea?.modelo_id ?? lineaData?.modelo_id ?? null;
        let varianteId = cleanLinea?.variante_id ?? lineaData?.variante_id ?? null;

        if (style) {
          modeloId = await ensureModeloId({
            style,
            customer: poCustomer,
            supplier: poSupplier,
            factory: poFactory,
          });

          varianteId = await ensureVarianteId({
            modelo_id: modeloId,
            season: poSeason,
            color,
            reference,
            factory: poFactory,
          });

          // Forzamos el link correcto (para que no dependa del usuario)
          cleanLinea.modelo_id = modeloId;
          cleanLinea.variante_id = varianteId;
        }

        // 1) Upsert línea
        if (lineaIdReal) {
          const { error: updateError } = await supabase
            .from("lineas_pedido")
            .update(cleanLinea)
            .eq("id", lineaIdReal);

          if (updateError) throw updateError;
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("lineas_pedido")
            .insert({ ...cleanLinea, po_id: params.id })
            .select()
            .single();

          if (insertError) throw insertError;
          lineaIdReal = inserted.id;
        }

        // ✅ 2) SNAPSHOT MASTER (si hay variante_id)
        const finalVarianteId = varianteId ?? cleanLinea?.variante_id;
        if (finalVarianteId) {
          await applySnapshotAndMaybeFillPrice({
            linea_id: lineaIdReal,
            supplier: poSupplier,
          });
        }

        // 3) Muestras
        if (Array.isArray(muestras)) {
          for (const m of muestras) {
            const { id: muestraId, ...muestraData } = m;
            const cleanMuestra = cleanObject(muestraData);

            if (muestraId) {
              const { error: updateMuestraError } = await supabase
                .from("muestras")
                .update(cleanMuestra)
                .eq("id", muestraId);

              if (updateMuestraError) throw updateMuestraError;
            } else {
              const { error: insertMuestraError } = await supabase
                .from("muestras")
                .insert({ ...cleanMuestra, linea_pedido_id: lineaIdReal });

              if (insertMuestraError) throw insertMuestraError;
            }
          }
        }
      }
    }

    console.log("✅ PO actualizado correctamente");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error actualizando PO:", error);
    return NextResponse.json(
      { message: error.message || "Error actualizando PO", details: error },
      { status: 500 }
    );
  }
}

// DELETE: eliminar un PO
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase.from("pos").delete().eq("id", params.id);
  if (error) {
    console.error("❌ Error eliminando PO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
