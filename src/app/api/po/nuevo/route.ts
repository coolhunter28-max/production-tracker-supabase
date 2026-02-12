import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Normaliza: convierte "" en null para fechas y otros opcionales
const normalizePO = (po: any) => {
  const dateFields = [
    "po_date",
    "etd_pi",
    "booking",
    "closing",
    "shipping_date",
    "inspection",
  ];

  const normalized = { ...po };
  for (const f of dateFields) {
    if (normalized[f] === "") normalized[f] = null;
  }
  return normalized;
};

function normText(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function isXiamenSupplier(supplier: any): boolean {
  const s = String(supplier || "").toUpperCase();
  return s.includes("XIAMEN DIC");
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

  // Match recomendado: style + customer + supplier
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

  // Si no existe, crearlo mínimo viable
  const { data: created, error: createErr } = await supabase
    .from("modelos")
    .insert({
      style,
      customer,
      supplier,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO entry (style match)",
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

  // Buscar variante existente
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

  // Insertar (si hay race condition, puede saltar 23505; reintento con select)
  const { data: created, error: createErr } = await supabase
    .from("modelo_variantes")
    .insert({
      modelo_id,
      season,
      color: color,
      reference: reference,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO entry (by reference)",
    })
    .select("id")
    .single();

  if (!createErr) return created.id as string;

  // Si es duplicado, re-buscar
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
  // 1) snapshot (no bloquea el guardado si falla, pero lo reportamos)
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

  // 2) si la línea no tiene price, rellena con el snapshot
  const { data: linea, error: lineaErr } = await supabase
    .from("lineas_pedido")
    .select(
      "id, price, master_buy_price_used, master_sell_price_used"
    )
    .eq("id", opts.linea_id)
    .single();

  if (lineaErr) {
    console.error("❌ Error leyendo línea tras snapshot:", lineaErr);
    return;
  }

  const priceNow = linea?.price;
  if (priceNow !== null && priceNow !== undefined) return;

  const useSell = isXiamenSupplier(opts.supplier);
  const nextPrice = useSell
    ? linea?.master_sell_price_used
    : linea?.master_buy_price_used;

  if (nextPrice === null || nextPrice === undefined) return;

  const { error: updErr } = await supabase
    .from("lineas_pedido")
    .update({ price: nextPrice })
    .eq("id", opts.linea_id);

  if (updErr) console.error("❌ Error rellenando price desde snapshot:", updErr);
}

export async function POST(req: Request) {
  try {
    const po = await req.json();
    const poData = normalizePO(po);

    // 1️⃣ Insertar cabecera del PO
    const { data: poInsert, error: poError } = await supabase
      .from("pos")
      .insert({
        season: poData.season,
        po: poData.po,
        customer: poData.customer,
        supplier: poData.supplier,
        factory: poData.factory,
        pi: poData.proforma_invoice,
        po_date: poData.po_date,
        etd_pi: poData.etd_pi,
        booking: poData.booking,
        closing: poData.closing,
        shipping_date: poData.shipping_date,
        inspection: poData.inspection,
        estado_inspeccion: poData.estado_inspeccion,
        currency: poData.currency,
        channel: poData.channel,
      })
      .select("id, season, customer, supplier, factory")
      .single();

    if (poError) throw poError;

    const poId = poInsert.id;
    const poSeason = poInsert.season;
    const poCustomer = poInsert.customer;
    const poSupplier = poInsert.supplier;
    const poFactory = poInsert.factory;

    // 2️⃣ Insertar líneas y muestras
    if (poData.lineas_pedido?.length) {
      for (const linea of poData.lineas_pedido) {
        const ref = normText(linea.reference);
        const style = normText(linea.style);
        const color = normText(linea.color);

        // ✅ Autofill modelo_id + variante_id
        const modeloId = await ensureModeloId({
          style,
          customer: poCustomer,
          supplier: poSupplier,
          factory: poFactory,
        });

        const varianteId = await ensureVarianteId({
          modelo_id: modeloId,
          season: poSeason,
          color,
          reference: ref,
          factory: poFactory,
        });

        const { data: lineaInsert, error: lineaError } = await supabase
          .from("lineas_pedido")
          .insert({
            po_id: poId,
            reference: ref,
            style,
            color,
            size_run: linea.size_run,
            category: linea.category,
            channel: linea.channel,
            qty: linea.qty,
            price: linea.price ?? null,
            amount: linea.amount ?? null,

            // ✅ nuevos campos
            modelo_id: modeloId,
            variante_id: varianteId,

            trial_upper: linea.trial_upper || null,
            trial_lasting: linea.trial_lasting || null,
            lasting: linea.lasting || null,
            finish_date: linea.finish_date || null,
          })
          .select("id")
          .single();

        if (lineaError) throw lineaError;
        const lineaId = lineaInsert.id;

        // ✅ snapshot + price si venía vacío
        if (varianteId) {
          await applySnapshotAndMaybeFillPrice({
            linea_id: lineaId,
            supplier: poSupplier,
          });
        }

        if (linea.muestras?.length) {
          const muestrasInsert = linea.muestras.map((m: any) => ({
            linea_pedido_id: lineaId,
            tipo_muestra: m.tipo_muestra,
            fecha_muestra: m.fecha_muestra || null,
            estado_muestra: m.estado_muestra,
            round: m.round,
            notas: m.notas,
            fecha_teorica: m.fecha_teorica || null,
          }));

          const { error: muestrasError } = await supabase
            .from("muestras")
            .insert(muestrasInsert);

          if (muestrasError) throw muestrasError;
        }
      }
    }

    return NextResponse.json({ success: true, id: poId });
  } catch (err: any) {
    console.error("❌ Error creando PO:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
