export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    console.log("📢 Cargando alertas...");

    // 🔍 Comprobar si la URL incluye ?todas=true
    const { searchParams } = new URL(req.url);
    const mostrarTodas = searchParams.get("todas") === "true";

    // 📆 Calcular fecha límite (hace 7 días)
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    const fechaLimiteISO = sieteDiasAtras.toISOString();

    // 📤 Consulta a Supabase
    let query = supabase
      .from("alertas")
      .select(`
        id,
        tipo,
        subtipo,
        fecha,
        severidad,
        mensaje,
        es_estimada,
        leida,
        po:po_id (
          id,
          po,
          customer
        ),
        linea_pedido:linea_pedido_id (
          id,
          reference,
          style,
          color
        ),
        muestra:muestra_id (
          id,
          tipo_muestra
        )
      `)
      .order("fecha", { ascending: false });

    // 🧩 Aplicar filtro si no se piden todas
    if (!mostrarTodas) {
      query = query.gte("fecha", fechaLimiteISO);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error cargando alertas:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      `✅ Alertas encontradas: ${data?.length || 0} (${
        mostrarTodas ? "todas" : "últimos 7 días"
      })`
    );

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("❌ Error inesperado:", err.message);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
