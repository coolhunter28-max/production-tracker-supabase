import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function getPOAccessStatus(poId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess();

  if (!access.userId || !access.isActive) {
    return { allowed: false, status: 401, error: "Usuario no autenticado.", supabase, access };
  }

  if (!poId || poId === "undefined" || poId === "null") {
    return { allowed: false, status: 400, error: "PO id inválido.", supabase, access };
  }

  const { data: po, error } = await supabase
    .from("pos")
    .select("id, customer")
    .eq("id", poId)
    .maybeSingle();

  if (error) return { allowed: false, status: 500, error: error.message, supabase, access };
  if (!po) return { allowed: false, status: 404, error: "PO no encontrado.", supabase, access };

  if (!access.canSeeAllCustomers && !access.customers.includes(po.customer ?? "")) {
    return { allowed: false, status: 403, error: "No tienes acceso a este PO.", supabase, access };
  }

  return { allowed: true, status: 200, error: null, supabase, access };
}

function buildLineaUpdatePayload(linea: any) {
  return {
    reference: text(linea.reference) ?? "",
    style: text(linea.style) ?? "",
    color: text(linea.color) ?? "",
    size_run: text(linea.size_run),
    category: text(linea.category),
    channel: text(linea.channel),
    qty: num(linea.qty) ?? 0,
    price: num(linea.price),
    amount: num(linea.amount),
    pi_number: text(linea.pi_number),
    pi_bsg: text(linea.pi_bsg),
    price_selling: num(linea.price_selling),
    amount_selling: num(linea.amount_selling),
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

function buildLineaInsertPayload(linea: any, poId: string) {
  return {
    ...buildLineaUpdatePayload(linea),
    po_id: poId,

    // Snapshots solo al crear línea nueva.
    master_buy_price_used: num(linea.master_buy_price_used),
    master_sell_price_used: num(linea.master_sell_price_used),
    master_currency_used: text(linea.master_currency_used),
    master_valid_from_used: dateOrNull(linea.master_valid_from_used),
    master_price_id_used: text(linea.master_price_id_used),
    master_price_source: text(linea.master_price_source),
  };
}

function buildMuestraPayload(muestra: any, lineaPedidoId: string) {
  return {
    linea_pedido_id: lineaPedidoId,
    tipo_muestra: text(muestra.tipo_muestra),
    round: text(muestra.round) ?? "1",
    fecha_muestra: dateOrNull(muestra.fecha_muestra),
    estado_muestra: text(muestra.estado_muestra) ?? "Pendiente",
    notas: text(muestra.notas),
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const poId = params.id;
  const accessStatus = await getPOAccessStatus(poId);

  if (!accessStatus.allowed) {
    return jsonError(accessStatus.error ?? "Acceso no permitido.", accessStatus.status);
  }

  const body = await req.json();
  const po = body.po ?? body;
  const lineas = Array.isArray(body.lineas_pedido) ? body.lineas_pedido : [];

  const nextCustomer = text(po.customer);

  if (
    !accessStatus.access.canSeeAllCustomers &&
    nextCustomer &&
    !accessStatus.access.customers.includes(nextCustomer)
  ) {
    return jsonError("No puedes reasignar el PO a un cliente fuera de tu cartera.", 403);
  }

  const { error: poError } = await accessStatus.supabase
    .from("pos")
    .update({
      po: text(po.po),
      season: text(po.season),
      customer: nextCustomer,
      supplier: text(po.supplier),
      factory: text(po.factory),
      currency: text(po.currency) ?? "USD",
      po_date: dateOrNull(po.po_date),
      etd_pi: dateOrNull(po.etd_pi),
      pi: text(po.pi),
      channel: text(po.channel),
      booking: text(po.booking),
      closing: text(po.closing),
      shipping_date: dateOrNull(po.shipping_date),
      inspection: text(po.inspection),
      estado_inspeccion: text(po.estado_inspeccion),
    })
    .eq("id", poId);

  if (poError) return jsonError(poError.message, 500);

  for (const linea of lineas) {
    let lineaId = text(linea.id);

    if (lineaId) {
      const { error: lineaError } = await accessStatus.supabase
        .from("lineas_pedido")
        .update(buildLineaUpdatePayload(linea))
        .eq("id", lineaId)
        .eq("po_id", poId);

      if (lineaError) return jsonError(lineaError.message, 500);
    } else {
      const { data: insertedLinea, error: insertError } = await accessStatus.supabase
        .from("lineas_pedido")
        .insert(buildLineaInsertPayload(linea, poId))
        .select("id")
        .single();

      if (insertError) return jsonError(insertError.message, 500);
      lineaId = insertedLinea.id;
    }

    if (!lineaId) {
      return jsonError("No se pudo resolver la línea para guardar muestras.", 500);
    }
    
    const safeLineaId: string = lineaId;
    
    const muestras = Array.isArray(linea.muestras) ? linea.muestras : [];
    const incomingMuestraIds = muestras.map((m: any) => text(m.id)).filter(Boolean) as string[];

    const { data: existingMuestras } = await accessStatus.supabase
      .from("muestras")
      .select("id")
      .eq("linea_pedido_id", lineaId);

    const existingIds = (existingMuestras ?? []).map((m: any) => m.id);
    const idsToDelete = existingIds.filter((id: string) => !incomingMuestraIds.includes(id));

    if (idsToDelete.length > 0) {
      const { error: deleteMuestrasError } = await accessStatus.supabase
        .from("muestras")
        .delete()
        .in("id", idsToDelete);

      if (deleteMuestrasError) return jsonError(deleteMuestrasError.message, 500);
    }

    for (const muestra of muestras) {
      if (!text(muestra.tipo_muestra)) continue;

      if (muestra.id) {
        const { error: updateMuestraError } = await accessStatus.supabase
          .from("muestras")
          .update(buildMuestraPayload(muestra, lineaId))
          .eq("id", muestra.id)
          .eq("linea_pedido_id", lineaId);

        if (updateMuestraError) return jsonError(updateMuestraError.message, 500);
      } else {
        const { error: insertMuestraError } = await accessStatus.supabase
          .from("muestras")
          .insert(buildMuestraPayload(muestra, lineaId));

        if (insertMuestraError) return jsonError(insertMuestraError.message, 500);
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const poId = params.id;
  const accessStatus = await getPOAccessStatus(poId);

  if (!accessStatus.allowed) {
    return jsonError(accessStatus.error ?? "Acceso no permitido.", accessStatus.status);
  }

  if (!["ADMIN", "MANAGER", "OPERATOR"].includes(accessStatus.access.role)) {
    return jsonError("No tienes permisos para eliminar POs.", 403);
  }

  const { error } = await accessStatus.supabase.from("pos").delete().eq("id", poId);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ success: true });
}