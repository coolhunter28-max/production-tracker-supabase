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

function isBsgOperativa(value: unknown) {
  return String(value ?? "").toUpperCase().includes("BSG");
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
  const round = text(muestra.round) ?? "Round 1";

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

function buildLineaPayload(linea: any, poId: string) {
  const channel = text(linea.channel);

  return {
    po_id: poId,
    reference: text(linea.reference) ?? "",
    style: text(linea.style) ?? "",
    color: text(linea.color) ?? "",
    size_run: text(linea.size_run),
    category: text(linea.category),
    channel,
    qty: num(linea.qty) ?? 0,
    price: num(linea.price),
    amount: num(linea.amount),
    pi_number: text(linea.pi_number),
    pi_bsg: isBsgOperativa(channel) ? text(linea.pi_bsg) : null,
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

    // Snapshot histórico: se captura al crear la línea.
    // No debe recalcularse por cambios posteriores en Master.
    master_buy_price_used: num(linea.master_buy_price_used),
    master_sell_price_used: num(linea.master_sell_price_used),
    master_currency_used: text(linea.master_currency_used),
    master_valid_from_used: dateOrNull(linea.master_valid_from_used),
    master_price_id_used: text(linea.master_price_id_used),
    master_price_source: text(linea.master_price_source),
  };
}

function buildMuestraPayload(
  muestra: any,
  lineaPedidoId: string,
  linea: any,
  poDate: unknown,
) {
  const round = text(muestra.round) ?? "Round 1";
  const isNoNeed = isNoNeedSample(round, muestra.estado_muestra);

  return {
    linea_pedido_id: lineaPedidoId,
    tipo_muestra: normalizeSampleType(muestra.tipo_muestra),
    round,
    fecha_teorica: isNoNeed ? null : calculateFechaTeoricaMuestra(muestra, linea, poDate),
    fecha_muestra: isNoNeed ? null : dateOrNull(muestra.fecha_muestra),
    estado_muestra: isNoNeed ? "N/N" : text(muestra.estado_muestra) ?? "Pendiente",
    notas: isNoNeed ? text(muestra.notas) ?? "No Need" : text(muestra.notas),
  };
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
  if (!text(po.po)) return jsonError("PO es obligatorio.");

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

  for (const linea of lineas) {
    const lineaPayload = buildLineaPayload(
      {
        ...linea,
        channel: text(linea.channel) ?? text(po.channel),
      },
      createdPO.id
    );

    const { data: createdLinea, error: lineaError } = await supabase
      .from("lineas_pedido")
      .insert(lineaPayload)
      .select("id")
      .single();

    if (lineaError) return jsonError(lineaError.message, 500);

    const muestras = Array.isArray(linea.muestras) ? linea.muestras : [];

    if (muestras.length > 0) {
      const muestrasPayload = muestras
        .filter((muestra: any) => text(muestra.tipo_muestra))
        .map((muestra: any) => buildMuestraPayload(muestra, createdLinea.id, linea, po.po_date));

      if (muestrasPayload.length > 0) {
        const { error: muestrasError } = await supabase
          .from("muestras")
          .insert(muestrasPayload);

        if (muestrasError) return jsonError(muestrasError.message, 500);
      }
    }
  }

  return NextResponse.json({ success: true, po: createdPO });
}
