import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // 👈 ojo, aquí la ruta es sin `src/` porque ya estás en `src`

// 🔹 GET → obtener PO + líneas + muestras
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // 1. Cabecera
  const { data: po, error } = await supabase
    .from("pos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 2. Líneas
  const { data: lineas } = await supabase
    .from("lineas_pedido")
    .select("*")
    .eq("po_id", id);

  // 3. Muestras de cada línea
  for (const linea of lineas || []) {
    const { data: muestras } = await supabase
      .from("muestras")
      .select("*")
      .eq("linea_pedido_id", linea.id);
    linea.muestras = muestras || [];
  }

  return NextResponse.json({ ...po, lineas_pedido: lineas || [] });
}

// 🔹 PUT → actualizar PO + líneas + muestras
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  // 1. Actualizar cabecera
  const { error: poError } = await supabase
    .from("pos")
    .update({
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
      currency: body.currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (poError) return NextResponse.json({ error: poError.message }, { status: 400 });

  // 2. Actualizar líneas
  for (const linea of body.lineas_pedido || []) {
    if (linea.id) {
      // Si tiene id → update
      await supabase.from("lineas_pedido").update({
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
        updated_at: new Date().toISOString(),
      }).eq("id", linea.id);
    } else {
      // Si no tiene id → insert
      const { data: newLinea } = await supabase
        .from("lineas_pedido")
        .insert({ ...linea, po_id: id })
        .select()
        .single();
      linea.id = newLinea?.id;
    }

    // 3. Guardar muestras asociadas
    for (const muestra of linea.muestras || []) {
      if (muestra.id) {
        await supabase.from("muestras").update({
          tipo_muestra: muestra.tipo_muestra,
          fecha_muestra: muestra.fecha_muestra,
          estado_muestra: muestra.estado_muestra,
          round: muestra.round,
          notas: muestra.notas,
          updated_at: new Date().toISOString(),
        }).eq("id", muestra.id);
      } else {
        await supabase.from("muestras").insert({
          ...muestra,
          linea_pedido_id: linea.id,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// 🔹 DELETE → borrar PO completo
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Borrar líneas primero
  const { data: lineas } = await supabase
    .from("lineas_pedido")
    .select("id")
    .eq("po_id", id);

  for (const l of lineas || []) {
    await supabase.from("muestras").delete().eq("linea_pedido_id", l.id);
  }

  await supabase.from("lineas_pedido").delete().eq("po_id", id);
  await supabase.from("pos").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
