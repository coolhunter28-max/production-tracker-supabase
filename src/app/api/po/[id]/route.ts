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
    if (value === undefined) continue; // no pisar con null si no viene
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

  let s = s0.replace(/[^\d.,-]/g, "");

  if (s.includes(",") && s.includes(".")) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
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
      channel: body.channel ?? undefined,
    });

    const { error: poError } = await supabase
      .from("pos")
      .update(poData)
      .eq("id", params.id);

    if (poError) throw poError;

    if (Array.isArray(body.lineas_pedido)) {
      for (const linea of body.lineas_pedido) {
        const { id: lineaId, muestras, ...lineaData } = linea;

        // 🔒 Normaliza BSG + numericos si vienen
        const normalizedLinea = {
          ...lineaData,

          // BSG
          price_selling:
            lineaData.price_selling !== undefined
              ? parseMoneyLike(lineaData.price_selling)
              : undefined,
          amount_selling:
            lineaData.amount_selling !== undefined
              ? parseMoneyLike(lineaData.amount_selling)
              : undefined,
          pi_bsg: lineaData.pi_bsg !== undefined ? lineaData.pi_bsg : undefined,

          // Coste / amount (por si viene en string desde UI)
          price:
            lineaData.price !== undefined ? parseMoneyLike(lineaData.price) : undefined,
          amount:
            lineaData.amount !== undefined ? parseMoneyLike(lineaData.amount) : undefined,
        };

        const cleanLinea = cleanObject(normalizedLinea);
        let lineaIdReal = lineaId;

        // 1) Upsert línea
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

        // ✅ 2) SNAPSHOT MASTER (si hay variante_id)
        // Esto hace que el sistema sea autosuficiente: aunque cambies variante/precio, el snapshot se recalcula al guardar.
        const varianteId = lineaData?.variante_id ?? cleanLinea?.variante_id;
        if (varianteId) {
          const { data: snapRes, error: snapErr } = await supabase.rpc(
            "apply_master_snapshot_for_line",
            { p_linea_id: lineaIdReal }
          );

          if (snapErr) {
            console.error("❌ Error snapshot master (RPC):", snapErr);
            // No lo hacemos fatal-error para no bloquear el guardado del PO.
            // Pero lo dejamos registrado para depurar.
          } else if (snapRes?.ok !== true) {
            console.warn("⚠️ Snapshot no aplicado:", snapRes);
          }
        }

        // 3) Muestras
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
