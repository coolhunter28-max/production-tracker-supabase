import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: obtener un PO con líneas + muestras
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from("pos")
    .select("*, lineas_pedido(*, muestras(*))")
    .eq("id", params.id)
    .single();

  if (error) {
    console.error("❌ Error obteniendo PO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Limpia valores "" → null
function cleanObject(obj: Record<string, any>) {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = value === "" ? null : value;
  }
  return cleaned;
}

// PUT: actualizar PO + líneas + muestras
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  try {
    const poData: Record<string, any> = cleanObject({
      season: body.season,
      po: body.po,
      customer: body.customer,
      supplier: body.supplier,
      factory: body.factory,
      po_date: body.po_date,
      etd_pi: body.etd_pi,
      booking: body.booking,
      closing: body.closing,
      shipping_date: body.shipping_date,
      inspection: body.inspection,
      estado_inspeccion: body.estado_inspeccion,
      currency: body.currency || "USD",
      pi: body.pi ?? null,
    });

    const { error: poError } = await supabase
      .from("pos")
      .update(poData)
      .eq("id", params.id);

    if (poError) throw poError;

    if (Array.isArray(body.lineas_pedido)) {
      for (const linea of body.lineas_pedido) {
        const { id: lineaId, muestras, ...lineaData } = linea;
        const cleanLinea = cleanObject(lineaData);
        let lineaIdReal = lineaId;

        if (lineaIdReal) {
          const { error: updateError } = await supabase
            .from("lineas_pedido")
            .update(cleanLinea)
            .eq("id", lineaIdReal);
          if (updateError) throw updateError;
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("lineas_pedido")
            .insert({ ...cleanLinea, po_id: params.id })
            .select()
            .single();
          if (insertError) throw insertError;
          lineaIdReal = inserted.id;
        }

        if (Array.isArray(muestras)) {
          for (const m of muestras) {
            const { id: muestraId, ...muestraData } = m;
            const cleanMuestra = cleanObject(muestraData);

            if (muestraId) {
              const { error: updateMuestraError } = await supabase
                .from("muestras")
                .update(cleanMuestra)
                .eq("id", muestraId);
              if (updateMuestraError) throw updateMuestraError;
            } else {
              const { error: insertMuestraError } = await supabase
                .from("muestras")
                .insert({ ...cleanMuestra, linea_pedido_id: lineaIdReal });
              if (insertMuestraError) throw insertMuestraError;
            }
          }
        }
      }
    }

    console.log("✅ PO actualizado correctamente");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error actualizando PO:", error);
    return NextResponse.json(
      { message: error.message || "Error actualizando PO", details: error },
      { status: 500 }
    );
  }
}

// DELETE: eliminar un PO
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase.from("pos").delete().eq("id", params.id);
  if (error) {
    console.error("❌ Error eliminando PO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
