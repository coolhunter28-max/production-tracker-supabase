import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 🔹 GET /api/po/[id] → trae PO + líneas + muestras
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data: po, error } = await supabase
      .from("pos")
      .select(
        `
        *,
        lineas_pedido (
          *,
          muestras (*)
        )
      `
      )
      .eq("id", params.id)
      .single();

    if (error) throw error;
    return NextResponse.json(po);
  } catch (err: any) {
    console.error("❌ Error GET PO:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔹 PUT /api/po/[id] → actualiza PO, líneas y muestras sin borrar todo
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const po = await req.json();

    // Normalizar fechas vacías a null
    const dateFields = [
      "po_date",
      "etd_pi",
      "booking",
      "closing",
      "shipping_date",
      "inspection",
    ];
    for (const f of dateFields) {
      if (po[f] === "") po[f] = null;
    }

    // 1️⃣ Actualizar cabecera
    const { error: poError } = await supabase
      .from("pos")
      .update({
        season: po.season,
        po: po.po,
        customer: po.customer,
        supplier: po.supplier,
        factory: po.factory,
        pi: po.proforma_invoice,
        po_date: po.po_date,
        etd_pi: po.etd_pi,
        booking: po.booking,
        closing: po.closing,
        shipping_date: po.shipping_date,
        inspection: po.inspection,
        estado_inspeccion: po.estado_inspeccion,
        currency: po.currency,
        channel: po.channel,
      })
      .eq("id", params.id);

    if (poError) throw poError;

    // 2️⃣ Obtener líneas actuales de la BD
    const { data: lineasActuales } = await supabase
      .from("lineas_pedido")
      .select("id")
      .eq("po_id", params.id);

    const lineasIdsActuales = new Set(lineasActuales?.map((l) => l.id) || []);
    const lineasIdsNuevos = new Set(
      (po.lineas_pedido || []).filter((l: any) => l.id).map((l: any) => l.id)
    );

    // 3️⃣ Borrar las líneas que ya no existen
    const lineasAEliminar = [...lineasIdsActuales].filter(
      (id) => !lineasIdsNuevos.has(id)
    );
    if (lineasAEliminar.length > 0) {
      await supabase.from("muestras").delete().in("linea_pedido_id", lineasAEliminar);
      await supabase.from("lineas_pedido").delete().in("id", lineasAEliminar);
    }

    // 4️⃣ Insertar/Actualizar líneas
    for (const linea of po.lineas_pedido || []) {
      let lineaId = linea.id;

      if (!lineaId) {
        // Nueva línea
        const { data: insertada, error: insertError } = await supabase
          .from("lineas_pedido")
          .insert({
            po_id: params.id,
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

        if (insertError) throw insertError;
        lineaId = insertada.id;
      } else {
        // Actualizar línea existente
        const { error: updateError } = await supabase
          .from("lineas_pedido")
          .update({
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
          .eq("id", lineaId);

        if (updateError) throw updateError;
      }

      // 🔹 Manejar muestras
      if (lineaId) {
        const { data: muestrasActuales } = await supabase
          .from("muestras")
          .select("id")
          .eq("linea_pedido_id", lineaId);

        const muestrasIdsActuales = new Set(muestrasActuales?.map((m) => m.id) || []);
        const muestrasIdsNuevos = new Set(
          (linea.muestras || []).filter((m: any) => m.id).map((m: any) => m.id)
        );

        // Borrar muestras eliminadas
        const muestrasAEliminar = [...muestrasIdsActuales].filter(
          (id) => !muestrasIdsNuevos.has(id)
        );
        if (muestrasAEliminar.length > 0) {
          await supabase.from("muestras").delete().in("id", muestrasAEliminar);
        }

        // Insertar/Actualizar muestras
        for (const muestra of linea.muestras || []) {
          if (!muestra.id) {
            // Insertar nueva
            const { error: insertError } = await supabase.from("muestras").insert({
              linea_pedido_id: lineaId,
              tipo_muestra: muestra.tipo_muestra,
              fecha_muestra: muestra.fecha_muestra || null,
              estado_muestra: muestra.estado_muestra,
              round: muestra.round,
              notas: muestra.notas,
              fecha_teorica: muestra.fecha_teorica || null,
            });
            if (insertError) throw insertError;
          } else {
            // Actualizar existente
            const { error: updateError } = await supabase
              .from("muestras")
              .update({
                tipo_muestra: muestra.tipo_muestra,
                fecha_muestra: muestra.fecha_muestra || null,
                estado_muestra: muestra.estado_muestra,
                round: muestra.round,
                notas: muestra.notas,
                fecha_teorica: muestra.fecha_teorica || null,
              })
              .eq("id", muestra.id);
            if (updateError) throw updateError;
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error PUT PO:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔹 DELETE /api/po/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Borrar muestras primero
    await supabase
      .from("muestras")
      .delete()
      .in(
        "linea_pedido_id",
        (
          await supabase.from("lineas_pedido").select("id").eq("po_id", params.id)
        ).data?.map((l) => l.id) || []
      );

    // Borrar líneas
    await supabase.from("lineas_pedido").delete().eq("po_id", params.id);

    // Borrar PO
    await supabase.from("pos").delete().eq("id", params.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error DELETE PO:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
