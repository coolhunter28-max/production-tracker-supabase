import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { getCurrentUserAccess } from "@/lib/ownership";

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess();

  if (!access.userId || !access.isActive) {
    return jsonError("Usuario no autenticado.", 401);
  }

  const body = await req.json();
  const po = body.po ?? {};
  const lineas = Array.isArray(body.lineas_pedido) ? body.lineas_pedido : [];

  const customer = text(po.customer);

  if (!customer) return jsonError("Customer es obligatorio.");
  if (!po.po) return jsonError("PO es obligatorio.");

  if (!access.canSeeAllCustomers && !access.customers.includes(customer)) {
    return jsonError("No puedes crear POs para un cliente fuera de tu cartera.", 403);
  }

  const { data: createdPO, error: poError } = await supabase
    .from("pos")
    .insert({
      po: text(po.po),
      season: text(po.season),
      customer,
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
    .select("*")
    .single();

  if (poError) return jsonError(poError.message, 500);

  if (lineas.length > 0) {
    const payload = lineas.map((linea: any) => ({
      po_id: createdPO.id,
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
      master_buy_price_used: num(linea.master_buy_price_used),
      master_sell_price_used: num(linea.master_sell_price_used),
      master_currency_used: text(linea.master_currency_used),
      master_valid_from_used: dateOrNull(linea.master_valid_from_used),
      master_price_id_used: text(linea.master_price_id_used),
      master_price_source: text(linea.master_price_source),
    }));

    const { error: lineasError } = await supabase.from("lineas_pedido").insert(payload);

    if (lineasError) return jsonError(lineasError.message, 500);
  }

  return NextResponse.json({ success: true, po: createdPO });
}