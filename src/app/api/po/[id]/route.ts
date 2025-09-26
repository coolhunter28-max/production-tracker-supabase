// src/app/api/po/[id]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// =======================
// GET  -> obtener detalle del PO
// =======================
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: po, error } = await supabase
    .from("pos")
    .select(
      `
      id,
      po,
      customer,
      supplier,
      factory,
      channel,
      po_date,
      etd_pi,
      shipping_date,
      booking,
      closing,
      lineas_pedido (
        id,
        reference,
        style,
        color,
        size_run,
        qty,
        price,
        amount,
        category,
        trial_upper,
        trial_lasting,
        lasting,
        finish_date,
        inspection,
        estado_inspeccion,
        muestras (
          id,
          tipo_muestra,
          fecha_muestra,
          estado_muestra,
          round,
          notas,
          fecha_teorica
        )
      )
    `
    )
    .eq("po", id) // buscamos por código de PO, no por UUID
    .maybeSingle();

  if (error) {
    console.error("❌ Error en GET /api/po/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!po) {
    return NextResponse.json({ error: "PO no encontrado" }, { status: 404 });
  }

  return NextResponse.json(po);
}

// =======================
// PATCH  -> actualizar PO
// =======================
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();

  // Actualizar cabecera
  if (body.cabecera) {
    const { error: errCab } = await supabase
      .from("pos")
      .update(body.cabecera)
      .eq("po", id);

    if (errCab) {
      console.error("❌ Error al actualizar cabecera:", errCab);
      return NextResponse.json({ error: errCab.message }, { status: 500 });
    }
  }

  // Actualizar líneas
  if (body.lineas && Array.isArray(body.lineas)) {
    for (const linea of body.lineas) {
      const { id: lineaId, ...rest } = linea;
      const { error: errLin } = await supabase
        .from("lineas_pedido")
        .update(rest)
        .eq("id", lineaId);

      if (errLin) {
        console.error("❌ Error al actualizar línea:", errLin);
        return NextResponse.json({ error: errLin.message }, { status: 500 });
      }
    }
  }

  // Actualizar muestras
  if (body.muestras && Array.isArray(body.muestras)) {
    for (const muestra of body.muestras) {
      const { id: muestraId, ...rest } = muestra;
      const { error: errM } = await supabase
        .from("muestras")
        .update(rest)
        .eq("id", muestraId);

      if (errM) {
        console.error("❌ Error al actualizar muestra:", errM);
        return NextResponse.json({ error: errM.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// =======================
// DELETE  -> borrar un PO
// =======================
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Primero borramos las muestras asociadas a las líneas de este PO
  const { data: lineas, error: errLineas } = await supabase
    .from("lineas_pedido")
    .select("id")
    .eq("po_id", id);

  if (errLineas) {
    console.error("❌ Error obteniendo líneas:", errLineas);
    return NextResponse.json({ error: errLineas.message }, { status: 500 });
  }

  if (lineas && lineas.length > 0) {
    const lineaIds = lineas.map((l) => l.id);

    const { error: errMuestras } = await supabase
      .from("muestras")
      .delete()
      .in("linea_pedido_id", lineaIds);

    if (errMuestras) {
      console.error("❌ Error borrando muestras:", errMuestras);
      return NextResponse.json({ error: errMuestras.message }, { status: 500 });
    }

    const { error: errLineasDel } = await supabase
      .from("lineas_pedido")
      .delete()
      .in("id", lineaIds);

    if (errLineasDel) {
      console.error("❌ Error borrando líneas:", errLineasDel);
      return NextResponse.json({ error: errLineasDel.message }, { status: 500 });
    }
  }

  // Finalmente borramos el PO
  const { error: errPo } = await supabase.from("pos").delete().eq("po", id);

  if (errPo) {
    console.error("❌ Error borrando PO:", errPo);
    return NextResponse.json({ error: errPo.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
