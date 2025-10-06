import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      .select("id")
      .single();

    if (poError) throw poError;
    const poId = poInsert.id;

    // 2️⃣ Insertar líneas y muestras
    if (poData.lineas_pedido?.length) {
      for (const linea of poData.lineas_pedido) {
        const { data: lineaInsert, error: lineaError } = await supabase
          .from("lineas_pedido")
          .insert({
            po_id: poId,
            reference: linea.reference,
            style: linea.style,
            color: linea.color,
            size_run: linea.size_run,
            category: linea.category,
            channel: linea.channel,
            qty: linea.qty,
            price: linea.price,
            amount: linea.amount,
            trial_upper: linea.trial_upper || null,
            trial_lasting: linea.trial_lasting || null,
            lasting: linea.lasting || null,
            finish_date: linea.finish_date || null,
          })
          .select("id")
          .single();

        if (lineaError) throw lineaError;
        const lineaId = lineaInsert.id;

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
