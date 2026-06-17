import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  for (const field of dateFields) {
    if (normalized[field] === "") normalized[field] = null;
  }

  return normalized;
};

function normText(value: any): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
}

function isXiamenSupplier(supplier: any): boolean {
  return String(supplier || "").toUpperCase().includes("XIAMEN DIC");
}

async function ensureModeloId(
  supabase: any,
  opts: {
    style: string | null;
    customer: string | null;
    supplier: string | null;
    factory?: string | null;
  }
) {
  const style = normText(opts.style);
  const customer = normText(opts.customer);
  const supplier = normText(opts.supplier);
  const factory = normText(opts.factory);

  if (!style) return null;

  const { data: found, error: findError } = await supabase
    .from("modelos")
    .select("id")
    .eq("style", style)
    .eq("customer", customer)
    .eq("supplier", supplier)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (found?.id) return found.id as string;

  const { data: created, error: createError } = await supabase
    .from("modelos")
    .insert({
      style,
      customer,
      supplier,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO entry",
    })
    .select("id")
    .single();

  if (createError) throw createError;

  return created.id as string;
}

async function ensureVarianteId(
  supabase: any,
  opts: {
    modelo_id: string | null;
    season: string | null;
    color: string | null;
    reference: string | null;
    factory?: string | null;
  }
) {
  const modeloId = opts.modelo_id;
  const season = normText(opts.season);
  const color = normText(opts.color);
  const reference = normText(opts.reference);
  const factory = normText(opts.factory);

  if (!modeloId || !season) return null;

  let query = supabase
    .from("modelo_variantes")
    .select("id")
    .eq("modelo_id", modeloId)
    .eq("season", season);

  query = color === null ? query.is("color", null) : query.eq("color", color);
  query =
    reference === null
      ? query.is("reference", null)
      : query.eq("reference", reference);

  const { data: found, error: findError } = await query.limit(1).maybeSingle();

  if (findError) throw findError;
  if (found?.id) return found.id as string;

  const { data: created, error: createError } = await supabase
    .from("modelo_variantes")
    .insert({
      modelo_id: modeloId,
      season,
      color,
      reference,
      factory: factory || null,
      status: "activo",
      notes: "Auto-created from manual PO entry",
    })
    .select("id")
    .single();

  if (!createError) return created.id as string;

  if (String(createError?.code || "") === "23505") {
    const { data: again, error: againError } = await query.limit(1).maybeSingle();

    if (againError) throw againError;
    if (again?.id) return again.id as string;
  }

  throw createError;
}

async function applySnapshotAndMaybeFillPrice(
  supabase: any,
  opts: {
    linea_id: string;
    supplier: string | null;
  }
) {
  const { data: snapResult, error: snapError } = await supabase.rpc(
    "apply_master_snapshot_for_line",
    { p_linea_id: opts.linea_id }
  );

  if (snapError) {
    console.error("❌ Error snapshot master:", snapError);
    return;
  }

  if (snapResult?.ok !== true) {
    console.warn("⚠️ Snapshot no aplicado:", snapResult);
    return;
  }

  const { data: linea, error: lineaError } = await supabase
    .from("lineas_pedido")
    .select("id, price, master_buy_price_used, master_sell_price_used")
    .eq("id", opts.linea_id)
    .single();

  if (lineaError) {
    console.error("❌ Error leyendo línea tras snapshot:", lineaError);
    return;
  }

  if (linea?.price !== null && linea?.price !== undefined) return;

  const useSell = isXiamenSupplier(opts.supplier);
  const nextPrice = useSell
    ? linea?.master_sell_price_used
    : linea?.master_buy_price_used;

  if (nextPrice === null || nextPrice === undefined) return;

  const { error: updateError } = await supabase
    .from("lineas_pedido")
    .update({ price: nextPrice })
    .eq("id", opts.linea_id);

  if (updateError) {
    console.error("❌ Error rellenando price desde snapshot:", updateError);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const po = await req.json();
    const poData = normalizePO(po);

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

    if (poData.lineas_pedido?.length) {
      for (const linea of poData.lineas_pedido) {
        const reference = normText(linea.reference);
        const style = normText(linea.style);
        const color = normText(linea.color);

        const modeloId = await ensureModeloId(supabase, {
          style,
          customer: poCustomer,
          supplier: poSupplier,
          factory: poFactory,
        });

        const varianteId = await ensureVarianteId(supabase, {
          modelo_id: modeloId,
          season: poSeason,
          color,
          reference,
          factory: poFactory,
        });

        const { data: lineaInsert, error: lineaError } = await supabase
          .from("lineas_pedido")
          .insert({
            po_id: poId,
            reference,
            style,
            color,
            size_run: linea.size_run,
            category: linea.category,
            channel: linea.channel,
            qty: linea.qty,
            price: linea.price ?? null,
            amount: linea.amount ?? null,
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

        if (varianteId) {
          await applySnapshotAndMaybeFillPrice(supabase, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error creando PO";

    console.error("❌ Error creando PO:", error);

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}