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

// Limpia valores "" → null (pero NO toca undefined)
function cleanObject(obj: Record<string, any>) {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue; // <-- clave: no pisar con null si no viene
    cleaned[key] = value === "" ? null : value;
  }
  return cleaned;
}

// Convierte "18,40" / "9.917,60" / "$9,917.60" -> number
function parseMoneyLike(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s0 = String(v).trim();
  if (!s0) return null;

  // quita símbolos y espacios
  let s = s0.replace(/[^\d.,-]/g, "");

  // Si tiene coma y punto, asumimos miles + decimal:
  // "9.917,60" -> miles "." y decimal ","
  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      // formato ES: 9.917,60
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // formato US: 9,917.60
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    // solo coma: "18,40" -> "18.40"
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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
      channel: body.channel ?? undefined, // por si lo usas
    });

    const { error: poError } = await supabase
      .from("pos")
      .update(poData)
      .eq("id", params.id);

    if (poError) throw poError;

    if (Array.isArray(body.lineas_pedido)) {
      for (const linea of body.lineas_pedido) {
        const { id: lineaId, muestras, ...lineaData } = linea;

        // 🔒 Normaliza los 3 campos BSG si vienen
        const normalizedLinea = {
          ...lineaData,
          price_selling:
            lineaData.price_selling !== undefined
              ? parseMoneyLike(lineaData.price_selling)
              : undefined,
          amount_selling:
            lineaData.amount_selling !== undefined
              ? parseMoneyLike(lineaData.amount_selling)
              : undefined,
          // pi_bsg lo dejamos tal cual (texto)
          pi_bsg: lineaData.pi_bsg !== undefined ? lineaData.pi_bsg : undefined,
        };

        const cleanLinea = cleanObject(normalizedLinea);
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
