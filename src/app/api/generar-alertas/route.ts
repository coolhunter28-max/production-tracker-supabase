import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Genera nuevas alertas a partir de datos de POs, líneas y muestras.
 */
export async function POST() {
  console.log("📢 Generando alertas...");

  try {
    // 🟢 1. Obtener todas las muestras junto con su línea y PO
    const { data: muestras, error: muestrasError } = await supabase
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
          po_id,
          pos (
            id,
            po,
            customer,
            supplier
          )
        )
      `);

    if (muestrasError) throw muestrasError;

    console.log(`📬 Encontradas ${muestras?.length || 0} muestras`);

    let nuevasAlertas = 0;

    // 🟢 2. Procesar cada muestra y generar alertas
    for (const m of muestras || []) {
      const po = m.lineas_pedido?.pos;
      const linea = m.lineas_pedido;

      if (!po || !linea) continue;

      // Ejemplo de alerta de producción: PPS o Fitting pendientes
      if (
        ["PPS", "Fitting"].includes(m.tipo_muestra) &&
        m.estado_muestra?.toLowerCase() === "pendiente"
      ) {
        const alerta = {
          tipo: "produccion",
          subtipo: m.tipo_muestra,
          fecha: m.fecha_muestra || new Date().toISOString(),
          severidad: "media",
          mensaje: `Alerta de producción: muestra ${m.tipo_muestra} pendiente (${po.customer} / ${linea.reference})`,
          po_id: po.id,
          linea_pedido_id: linea.id,
          muestra_id: m.id,
          es_estimada: false,
          leida: false,
        };

        const { error: insertError } = await supabase.from("alertas").insert(alerta);

        if (insertError) {
          // Si ya existe una alerta con esa muestra_id, lo ignoramos
          if (
            insertError.message?.includes("duplicate key") ||
            insertError.message?.includes("unique constraint")
          ) {
            console.warn("⚠️ Alerta duplicada (muestra ya tiene alerta)");
            continue;
          } else {
            console.error("⚠️ Error insertando alerta:", insertError.message);
            continue;
          }
        }

        nuevasAlertas++;
      }
    }

    console.log(`📬 Generadas ${nuevasAlertas} posibles alertas...`);
    console.log("✅ Generación de alertas finalizada correctamente.");

    // 🟢 3. Devolver respuesta correcta con JSON
    return NextResponse.json({
      success: true,
      nuevas: nuevasAlertas,
      message: "Alertas generadas correctamente.",
    });
  } catch (error: any) {
    console.error("❌ Error generando alertas:", error);
    return NextResponse.json(
      {
        error: error.message || "Error generando alertas.",
        details: error,
      },
      { status: 500 }
    );
  }
}
