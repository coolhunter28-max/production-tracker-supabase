import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 🔹 POST → crear nuevo PO con líneas y muestras
export async function POST(req: Request) {
  const body = await req.json();

  // 1. Insertar cabecera
  const { data: newPO, error: poError } = await supabase
    .from("pos")
    .insert({
      po: body.po,
      customer: body.customer,
      supplier: body.supplier,
      factory: body.factory,
      season: body.season,
      category: body.category,
      channel: body.channel,
      po_date: body.po_date,
      etd_pi: body.etd_pi,
      pi: body.proforma_invoice,
      booking: body.booking,
      closing: body.closing,
      shipping_date: body.shipping_date,
      inspection: body.inspection,
      estado_inspeccion: body.estado_inspeccion,
      currency: body.currency || "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (poError) return NextResponse.json({ error: poError.message }, { status: 400 });

  // 2. Insertar líneas
  for (const linea of body.lineas_pedido || []) {
    const { data: newLinea, error: lineaError } = await supabase
      .from("lineas_pedido")
      .insert({
        po_id: newPO.id,
        reference: linea.reference,
        style: linea.style,
        color: linea.color,
        size_run: linea.size_run,
        qty: linea.qty,
        price: linea.price,
        amount: (linea.qty || 0) * (linea.price || 0),
        category: linea.category,
        channel: linea.channel,
        trial_upper: linea.trial_upper,
        trial_lasting: linea.trial_lasting,
        lasting: linea.lasting,
        finish_date: linea.finish_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (lineaError) return NextResponse.json({ error: lineaError.message }, { status: 400 });

    // 3. Insertar muestras de esa línea
    for (const muestra of linea.muestras || []) {
      const { error: muestraError } = await supabase
        .from("muestras")
        .insert({
          linea_pedido_id: newLinea.id,
          tipo_muestra: muestra.tipo_muestra,
          fecha_muestra: muestra.fecha_muestra,
          estado_muestra: muestra.estado_muestra,
          round: muestra.round,
          notas: muestra.notas,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (muestraError) return NextResponse.json({ error: muestraError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, id: newPO.id });
}
