import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ✅ GET /api/po/[id]
// Funciona tanto con el UUID como con el número de PO (texto).
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // ---- 1. Intentamos buscar por UUID ----
  let { data: po, error } = await supabase
    .from("pos")
    .select(`
      id,
      po,
      supplier,
      customer,
      factory,
      channel,
      po_date,
      etd_pi,
      booking,
      closing,
      shipping_date,
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
          notas
        )
      )
    `)
    .eq("id", id) // por UUID
    .single();

  // ---- 2. Si no hay resultado, probamos por campo `po` ----
  if (error || !po) {
    ({ data: po, error } = await supabase
      .from("pos")
      .select(`
        id,
        po,
        supplier,
        customer,
        factory,
        channel,
        po_date,
        etd_pi,
        booking,
        closing,
        shipping_date,
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
            notas
          )
        )
      `)
      .eq("po", id) // 👈 ahora por número de PO (texto)
      .single());
  }

  if (error) {
    console.error("❌ Error en GET /api/po/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!po) {
    return NextResponse.json(
      { error: "No se encontró el PO" },
      { status: 404 }
    );
  }

  return NextResponse.json(po);
}
