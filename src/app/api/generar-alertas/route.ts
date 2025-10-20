import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  console.log("📢 Generando alertas...");

  try {
    //1️⃣ Obtener todas las muestras junto con su línea y PO
    const { data: muestras, error } = await supabase
      .from("muestras")
      .select(`
        id,
        tipo_muestra,
        fecha_muestra,
        estado_muestra,
        lineas_pedido (
          id,
          reference,
          style,
          color,
          pos (
            id,
            po,
            customer,
            supplier
          )
        )
      `);

    if (error) throw error;

    console.log(`📬 Encontradas ${muestras?.length || 0} muestras`);

    const nuevasAlertas = [];

    // 2️⃣ Procesar cada muestra y generar alertas
    for (const m of muestras || []) {
      const linea = m.lineas_pedido?.[0];
      const po = linea?.pos?.[0];

      if (!po || !linea) continue;

      const alerta = {
        tipo: "muestra",
        subtipo: m.tipo_muestra,
        fecha: m.fecha_muestra || new Date().toISOString(),
        severidad: "media",
        mensaje: `Alerta de producción: muestra ${m.tipo_muestra} pendiente (${po.customer} / ${linea.reference})`,
        po_id: po.id,
        linea_pedido_id: linea.id,
        muestra_id: m.id,
      };

      const { data: existente } = await supabase
        .from("alertas")
        .select("id")
        .eq("muestra_id", m.id)
        .maybeSingle();

      if (!existente) {
        const { error: insertError } = await supabase
          .from("alertas")
          .insert([alerta]);

        if (insertError) {
          console.warn("⚠ Error insertando alerta:", insertError.message);
        } else {
          nuevasAlertas.push(alerta);
        }
      } else {
        console.warn("⚠ Alerta duplicada (muestra ya tiene alerta)");
      }
    }

    console.log(`📬 Generadas ${nuevasAlertas.length} posibles alertas...`);
    console.log("✅ Generación de alertas finalizada correctamente.");

    return NextResponse.json({
      success: true,
      alertas: nuevasAlertas,
      message: `Se generaron ${nuevasAlertas.length} nuevas alertas.`,
    });
  } catch (err: any) {
    console.error("❌ Error generando alertas:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Error generando alertas",
        details: err.message || err,
      },
      { status: 500 }
    );
  }
}
