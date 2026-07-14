import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
}

function dateOrNull(value: unknown): string | null {
  const text = normText(value);
  return text;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function isXiamenSupplier(supplier: unknown): boolean {
  return String(supplier ?? "").toUpperCase().includes("XIAMEN DIC");
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
      factory,
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
      factory,
      status: "activo",
      notes: "Auto-created from manual PO entry",
    })
    .select("id")
    .single();

  if (!createError) return created.id as string;

  if (String(createError?.code ?? "") === "23505") {
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
    const body = await req.json();

    /*
     * Compatibilidad:
     * - El formulario actual puede enviar { po, lineas_pedido }.
     * - El endpoint antiguo recibía los campos de cabecera directamente.
     */
    const poData = body?.po ?? body;
    const lineas = Array.isArray(body?.lineas_pedido)
      ? body.lineas_pedido
      : Array.isArray(poData?.lineas_pedido)
        ? poData.lineas_pedido
        : [];

    const poNumber = normText(poData?.po);
    const season = normText(poData?.season);
    const customer = normText(poData?.customer);
    const supplier = normText(poData?.supplier);

    if (!poNumber) {
      return NextResponse.json(
        { success: false, message: "PO es obligatorio." },
        { status: 400 }
      );
    }

    if (!season) {
      return NextResponse.json(
        { success: false, message: "Season es obligatoria." },
        { status: 400 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer es obligatorio." },
        { status: 400 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier es obligatorio." },
        { status: 400 }
      );
    }

    if (lineas.length === 0) {
      return NextResponse.json(
        { success: false, message: "Debes añadir al menos una línea." },
        { status: 400 }
      );
    }

    for (const [index, linea] of lineas.entries()) {
      if (!normText(linea?.factory)) {
        return NextResponse.json(
          {
            success: false,
            message: `La línea ${index + 1} no tiene fábrica.`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * Cabecera PO:
     * sólo información realmente común a todas las líneas.
     *
     * Las columnas antiguas de factory/booking/closing/shipping/inspection
     * permanecen en la tabla por compatibilidad, pero ya no son fuente operativa
     * y este flujo no las escribe.
     */
    const { data: poInsert, error: poError } = await supabase
      .from("pos")
      .insert({
        season,
        po: poNumber,
        customer,
        supplier,
        po_date: dateOrNull(poData?.po_date),
        currency: normText(poData?.currency) ?? "USD",
        channel: normText(poData?.channel),
      })
      .select("id, season, customer, supplier")
      .single();

    if (poError) throw poError;

    const poId = poInsert.id as string;
    const poSeason = normText(poInsert.season);
    const poCustomer = normText(poInsert.customer);
    const poSupplier = normText(poInsert.supplier);

    for (const linea of lineas) {
      const reference = normText(linea?.reference);
      const style = normText(linea?.style);
      const color = normText(linea?.color);
      const lineFactory = normText(linea?.factory);

      const modeloId =
        normText(linea?.modelo_id) ??
        (await ensureModeloId(supabase, {
          style,
          customer: poCustomer,
          supplier: poSupplier,
          factory: lineFactory,
        }));

      const varianteId =
        normText(linea?.variante_id) ??
        (await ensureVarianteId(supabase, {
          modelo_id: modeloId,
          season: poSeason,
          color,
          reference,
          factory: lineFactory,
        }));

      const { data: lineaInsert, error: lineaError } = await supabase
        .from("lineas_pedido")
        .insert({
          po_id: poId,

          modelo_id: modeloId,
          variante_id: varianteId,

          reference,
          style,
          color,
          size_run: normText(linea?.size_run),
          category: normText(linea?.category),
          channel: normText(linea?.channel) ?? normText(poData?.channel),

          factory: lineFactory,
          qty: numberOrNull(linea?.qty),

          price: numberOrNull(linea?.price),
          amount: numberOrNull(linea?.amount),
          price_selling: numberOrNull(linea?.price_selling),
          amount_selling: numberOrNull(linea?.amount_selling),

          pi_number: normText(linea?.pi_number),
          pi_bsg: normText(linea?.pi_bsg),
          etd: dateOrNull(linea?.etd),

          booking: dateOrNull(linea?.booking),
          closing: dateOrNull(linea?.closing),
          shipping_date: dateOrNull(linea?.shipping_date),
          inspection: dateOrNull(linea?.inspection),

          trial_upper: dateOrNull(linea?.trial_upper),
          trial_lasting: dateOrNull(linea?.trial_lasting),
          lasting: dateOrNull(linea?.lasting),
          finish_date: dateOrNull(linea?.finish_date),
        })
        .select("id")
        .single();

      if (lineaError) throw lineaError;

      const lineaId = lineaInsert.id as string;

      if (varianteId) {
        await applySnapshotAndMaybeFillPrice(supabase, {
          linea_id: lineaId,
          supplier: poSupplier,
        });
      }

      if (Array.isArray(linea?.muestras) && linea.muestras.length > 0) {
        const muestrasInsert = linea.muestras.map((muestra: any) => ({
          linea_pedido_id: lineaId,
          tipo_muestra: normText(muestra?.tipo_muestra),
          fecha_muestra: dateOrNull(muestra?.fecha_muestra),
          estado_muestra: normText(muestra?.estado_muestra),
          round: normText(muestra?.round),
          notas: normText(muestra?.notas),
          fecha_teorica: dateOrNull(muestra?.fecha_teorica),
        }));

        const { error: muestrasError } = await supabase
          .from("muestras")
          .insert(muestrasInsert);

        if (muestrasError) throw muestrasError;
      }
    }

    return NextResponse.json({ success: true, id: poId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error creando PO";

    console.error("❌ Error creando PO:", error);

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}