export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(req.url);
    const mostrarTodas = searchParams.get("todas") === "true";

    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    const fechaLimiteISO = sieteDiasAtras.toISOString();

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

    if (!mostrarTodas) {
      query = query.gte("fecha", fechaLimiteISO);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error cargando alertas:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";

    console.error("❌ Error inesperado:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}