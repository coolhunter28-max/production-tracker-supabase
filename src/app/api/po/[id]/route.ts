import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    id: string;
  };
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function text(value: unknown) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
}

function dateOrNull(value: unknown) {
  return text(value);
}

function num(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function isBsg(value: unknown) {
  const v = String(value ?? "").trim().toUpperCase();
  return v.includes("BSG");
}

function addDays(dateValue: unknown, days: number) {
  const value = dateOrNull(dateValue);
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function normalizeSampleType(value: unknown) {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "DEVELOPMENT") return "CFMS";
  if (v === "COUNTER" || v === "COUNTER SAMPLE") return "COUNTERS";
  if (v === "FITTING" || v === "FITTING SAMPLE") return "FITTINGS";
  if (v === "SHIPPING" || v === "SHIPPING SAMPLE" || v === "SHIPPING SAMPLES") {
    return "SHIPPINGS";
  }
  return v || null;
}

function isNoNeedSample(round: unknown, estado: unknown) {
  return (
    String(round ?? "").trim().toUpperCase() === "N/N" ||
    String(estado ?? "").trim().toUpperCase() === "N/N"
  );
}

function calculateFechaTeoricaMuestra(muestra: any, linea: any, poDate: unknown) {
  const round = normalizeMuestraRound(muestra.round);

  if (isNoNeedSample(round, muestra.estado_muestra)) {
    return null;
  }

  const tipoMuestra = normalizeSampleType(muestra.tipo_muestra);

  switch (tipoMuestra) {
    case "COUNTERS":
      return addDays(poDate, 10);
    case "CFMS":
    case "FITTINGS":
      return addDays(poDate, 25);
    case "PPS":
      return addDays(poDate, 45);
    case "SHIPPINGS":
      return addDays(linea.finish_date, -7);
    case "TESTINGS":
    default:
      return null;
  }
}

async function getPOAccessStatus(poId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess();

  if (!access.userId || !access.isActive) {
    return {
      allowed: false,
      status: 401,
      error: "Usuario no autenticado.",
      supabase,
      access,
      po: null,
    };
  }

  if (!poId || poId === "undefined" || poId === "null") {
    return {
      allowed: false,
      status: 400,
      error: "PO id inválido.",
      supabase,
      access,
      po: null,
    };
  }

  const { data: po, error } = await supabase
    .from("pos")
    .select("id, customer")
    .eq("id", poId)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      status: 500,
      error: error.message,
      supabase,
      access,
      po: null,
    };
  }

  if (!po) {
    return {
      allowed: false,
      status: 404,
      error: "PO no encontrado.",
      supabase,
      access,
      po: null,
    };
  }

  if (!access.canSeeAllCustomers && !access.customers.includes(po.customer ?? "")) {
    return {
      allowed: false,
      status: 403,
      error: "No tienes acceso a este PO.",
      supabase,
      access,
      po,
    };
  }

  return {
    allowed: true,
    status: 200,
    error: null,
    supabase,
    access,
    po,
  };
}

function buildPOPayload(po: any) {
  return {
    po: text(po.po),
    season: text(po.season),
    customer: text(po.customer),
    supplier: text(po.supplier),
    factory: text(po.factory),
    currency: text(po.currency) ?? "USD",
    po_date: dateOrNull(po.po_date),

    // Campos legacy/de cabecera. La operativa nueva puede informar PI/ETD por línea.
    etd_pi: dateOrNull(po.etd_pi),
    pi: text(po.pi),

    channel: text(po.channel),
    booking: text(po.booking),
    closing: text(po.closing),
    shipping_date: dateOrNull(po.shipping_date),
    inspection: text(po.inspection),
    estado_inspeccion: text(po.estado_inspeccion),
  };
}

function buildLineaUpdatePayload(linea: any, poChannel: unknown) {
  const lineaChannel = text(linea.channel) ?? text(poChannel);
  const bsgLine = isBsg(lineaChannel) || isBsg(poChannel);

  return {
    reference: text(linea.reference) ?? "",
    style: text(linea.style) ?? "",
    color: text(linea.color) ?? "",
    size_run: text(linea.size_run),
    category: text(linea.category),
    channel: lineaChannel,
    qty: num(linea.qty) ?? 0,
    price: num(linea.price),
    amount: num(linea.amount),

    // PI normal por línea. Válida para XIAMEN y también como PI estándar.
    pi_number: text(linea.pi_number),

    // Exclusivo BSG. En XIAMEN no se persiste pi_bsg.
    pi_bsg: bsgLine ? text(linea.pi_bsg) : null,

    price_selling: num(linea.price_selling),
    amount_selling: num(linea.amount_selling),

    // ETD PI por línea.
    etd: dateOrNull(linea.etd),

    inspection: dateOrNull(linea.inspection),
    estado_inspeccion: text(linea.estado_inspeccion),
    trial_upper: text(linea.trial_upper),
    trial_lasting: text(linea.trial_lasting),
    lasting: text(linea.lasting),
    finish_date: dateOrNull(linea.finish_date),
    modelo_id: text(linea.modelo_id),
    variante_id: text(linea.variante_id),
  };
}

function buildLineaInsertPayload(linea: any, poId: string, poChannel: unknown) {
  return {
    ...buildLineaUpdatePayload(linea, poChannel),
    po_id: poId,

    // Snapshots solo al crear línea nueva.
    // Nunca se actualizan aquí para proteger el histórico de lineas_pedido.
    master_buy_price_used: num(linea.master_buy_price_used),
    master_sell_price_used: num(linea.master_sell_price_used),
    master_currency_used: text(linea.master_currency_used),
    master_valid_from_used: dateOrNull(linea.master_valid_from_used),
    master_price_id_used: text(linea.master_price_id_used),
    master_price_source: text(linea.master_price_source),
  };
}

function normalizeMuestraRound(value: unknown) {
  const v = text(value);
  if (!v) return "Round 1";
  if (v.toUpperCase() === "N/N") return "N/N";
  return v;
}

function normalizeMuestraEstado(value: unknown, round: string) {
  if (round.toUpperCase() === "N/N") return "N/N";
  return text(value) ?? "Pendiente";
}

function buildMuestraBasePayload(muestra: any, lineaPedidoId: string) {
  const round = normalizeMuestraRound(muestra.round);
  const isNoNeed = isNoNeedSample(round, muestra.estado_muestra);

  return {
    linea_pedido_id: lineaPedidoId,
    tipo_muestra: normalizeSampleType(muestra.tipo_muestra),
    round,
    fecha_muestra: isNoNeed ? null : dateOrNull(muestra.fecha_muestra),
    estado_muestra: normalizeMuestraEstado(muestra.estado_muestra, round),
    notas: isNoNeed ? text(muestra.notas) ?? "No Need" : text(muestra.notas),
  };
}

function buildMuestraInsertPayload(
  muestra: any,
  lineaPedidoId: string,
  linea: any,
  poDate: unknown,
) {
  const round = normalizeMuestraRound(muestra.round);
  const isNoNeed = isNoNeedSample(round, muestra.estado_muestra);
  const payload: Record<string, unknown> = buildMuestraBasePayload(muestra, lineaPedidoId);

  payload.fecha_teorica = isNoNeed ? null : calculateFechaTeoricaMuestra(muestra, linea, poDate);

  return payload;
}

function buildMuestraUpdatePayload(
  muestra: any,
  lineaPedidoId: string,
  linea: any,
  poDate: unknown,
) {
  const round = normalizeMuestraRound(muestra.round);
  const isNoNeed = isNoNeedSample(round, muestra.estado_muestra);
  const payload: Record<string, unknown> = buildMuestraBasePayload(muestra, lineaPedidoId);

  payload.fecha_teorica = isNoNeed ? null : calculateFechaTeoricaMuestra(muestra, linea, poDate);

  return payload;
}

async function deleteLineasWithMuestras(
  supabase: SupabaseClient,
  poId: string,
  lineaIds: string[],
) {
  if (lineaIds.length === 0) return null;

  const { error: muestrasError } = await supabase
    .from("muestras")
    .delete()
    .in("linea_pedido_id", lineaIds);

  if (muestrasError) return muestrasError;

  const { error: lineasError } = await supabase
    .from("lineas_pedido")
    .delete()
    .eq("po_id", poId)
    .in("id", lineaIds);

  return lineasError;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const poId = params.id;
  const accessStatus = await getPOAccessStatus(poId);

  if (!accessStatus.allowed) {
    return jsonError(accessStatus.error ?? "Acceso no permitido.", accessStatus.status);
  }

  const { data, error } = await accessStatus.supabase
    .from("pos")
    .select("*, lineas_pedido(*, muestras(*))")
    .eq("id", poId)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const poId = params.id;
  const accessStatus = await getPOAccessStatus(poId);

  if (!accessStatus.allowed) {
    return jsonError(accessStatus.error ?? "Acceso no permitido.", accessStatus.status);
  }

  const body = await req.json();
  const po = body.po ?? body;
  const lineas = Array.isArray(body.lineas_pedido) ? body.lineas_pedido : [];
  const poPayload = buildPOPayload(po);
  const nextCustomer = poPayload.customer;

  if (!nextCustomer) {
    return jsonError("El cliente es obligatorio.", 400);
  }

  if (
    !accessStatus.access.canSeeAllCustomers &&
    !accessStatus.access.customers.includes(nextCustomer)
  ) {
    return jsonError("No puedes reasignar el PO a un cliente fuera de tu cartera.", 403);
  }

  const { error: poError } = await accessStatus.supabase
    .from("pos")
    .update(poPayload)
    .eq("id", poId);

  if (poError) return jsonError(poError.message, 500);

  const { data: existingLineas, error: existingLineasError } = await accessStatus.supabase
    .from("lineas_pedido")
    .select("id")
    .eq("po_id", poId);

  if (existingLineasError) return jsonError(existingLineasError.message, 500);

  const existingLineaIds = (existingLineas ?? []).map((linea: any) => String(linea.id));
  const incomingExistingLineaIds = lineas
    .map((linea: any) => text(linea.id))
    .filter((id: string | null): id is string => Boolean(id));

  const lineasToDelete = existingLineaIds.filter((id) => !incomingExistingLineaIds.includes(id));
  const deleteLineasError = await deleteLineasWithMuestras(
    accessStatus.supabase,
    poId,
    lineasToDelete,
  );

  if (deleteLineasError) return jsonError(deleteLineasError.message, 500);

  for (const linea of lineas) {
    let lineaId = text(linea.id);

    if (lineaId) {
      if (!existingLineaIds.includes(lineaId)) {
        return jsonError("Una línea enviada no pertenece a este PO.", 403);
      }

      const { error: lineaError } = await accessStatus.supabase
        .from("lineas_pedido")
        .update(buildLineaUpdatePayload(linea, poPayload.channel))
        .eq("id", lineaId)
        .eq("po_id", poId);

      if (lineaError) return jsonError(lineaError.message, 500);
    } else {
      const { data: insertedLinea, error: insertError } = await accessStatus.supabase
        .from("lineas_pedido")
        .insert(buildLineaInsertPayload(linea, poId, poPayload.channel))
        .select("id")
        .single();

      if (insertError) return jsonError(insertError.message, 500);
      lineaId = insertedLinea.id;
    }

    if (!lineaId) {
      return jsonError("No se pudo resolver la línea para guardar muestras.", 500);
    }

    const muestras = Array.isArray(linea.muestras) ? linea.muestras : [];
    const incomingMuestraIds = muestras
      .map((muestra: any) => text(muestra.id))
      .filter((id: string | null): id is string => Boolean(id));

    const { data: existingMuestras, error: existingMuestrasError } = await accessStatus.supabase
      .from("muestras")
      .select("id")
      .eq("linea_pedido_id", lineaId);

    if (existingMuestrasError) return jsonError(existingMuestrasError.message, 500);

    const existingMuestraIds = (existingMuestras ?? []).map((muestra: any) =>
      String(muestra.id),
    );
    const muestrasToDelete = existingMuestraIds.filter(
      (id) => !incomingMuestraIds.includes(id),
    );

    if (muestrasToDelete.length > 0) {
      const { error: deleteMuestrasError } = await accessStatus.supabase
        .from("muestras")
        .delete()
        .eq("linea_pedido_id", lineaId)
        .in("id", muestrasToDelete);

      if (deleteMuestrasError) return jsonError(deleteMuestrasError.message, 500);
    }

    for (const muestra of muestras) {
      const round = normalizeMuestraRound(muestra.round);
      const tipoMuestra = text(muestra.tipo_muestra);

      // N/N es una decisión operativa explícita: No Need.
      // Debe conservarse aunque no tenga tipo_muestra informado.
      if (!tipoMuestra && round.toUpperCase() !== "N/N") continue;

      const muestraId = text(muestra.id);

      if (muestraId) {
        if (!existingMuestraIds.includes(muestraId)) {
          return jsonError("Una muestra enviada no pertenece a esta línea.", 403);
        }

        const { error: updateMuestraError } = await accessStatus.supabase
          .from("muestras")
          .update(buildMuestraUpdatePayload(muestra, lineaId, linea, poPayload.po_date))
          .eq("id", muestraId)
          .eq("linea_pedido_id", lineaId);

        if (updateMuestraError) return jsonError(updateMuestraError.message, 500);
      } else {
        const { error: insertMuestraError } = await accessStatus.supabase
          .from("muestras")
          .insert(buildMuestraInsertPayload(muestra, lineaId, linea, poPayload.po_date));

        if (insertMuestraError) return jsonError(insertMuestraError.message, 500);
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const poId = params.id;
  const accessStatus = await getPOAccessStatus(poId);

  if (!accessStatus.allowed) {
    return jsonError(accessStatus.error ?? "Acceso no permitido.", accessStatus.status);
  }

  if (!["ADMIN", "MANAGER", "OPERATOR"].includes(accessStatus.access.role)) {
    return jsonError("No tienes permisos para eliminar POs.", 403);
  }

  const { data: lineas, error: lineasError } = await accessStatus.supabase
    .from("lineas_pedido")
    .select("id")
    .eq("po_id", poId);

  if (lineasError) return jsonError(lineasError.message, 500);

  const lineaIds = (lineas ?? []).map((linea: any) => String(linea.id));
  const deleteLineasError = await deleteLineasWithMuestras(
    accessStatus.supabase,
    poId,
    lineaIds,
  );

  if (deleteLineasError) return jsonError(deleteLineasError.message, 500);

  const { error } = await accessStatus.supabase.from("pos").delete().eq("id", poId);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}
