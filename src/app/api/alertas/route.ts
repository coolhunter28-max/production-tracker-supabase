import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/alertas?leida=false
 * Devuelve alertas deduplicadas con joins mínimos para el dashboard
 * 🔹 Ahora solo devuelve las de los últimos 15 días
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leida = searchParams.get("leida");

    // Fecha mínima (15 días hacia atrás)
    const hoy = new Date();
    const hace15 = new Date(hoy);
    hace15.setDate(hoy.getDate() - 15);

    // Traemos lo que necesitamos para el dashboard
    const { data, error } = await supabase
      .from("alertas")
      .select(`
        id,
        tipo,
        subtipo,
        severidad,
        fecha,
        es_estimada,
        leida,
        pos:pos (
          id,
          po,
          customer
        ),
        lineas_pedido:lineas_pedido (
          reference,
          style,
          color
        ),
        muestras:muestras (
          tipo_muestra
        )
      `)
      .eq("leida", leida === "true") // si no pasas leida, Next envía null → no filtra
      .gte("fecha", hace15.toISOString().slice(0, 10)) // 👈 solo últimos 15 días
      .order("fecha", { ascending: false });

    if (error) {
      console.error("❌ Error en la consulta de alertas:", error);
      return NextResponse.json(
        { error: "Error al obtener las alertas" },
        { status: 500 }
      );
    }

    // Asegurar array
    const rows = Array.isArray(data) ? data : [];

    // De-duplicado (preferimos no estimadas frente a estimadas)
    const seen = new Map<string, any>();
    for (const a of rows) {
      const key = [
        a?.pos?.po ?? "",
        a?.tipo ?? "",
        a?.tipo === "muestra"
          ? a?.muestras?.tipo_muestra ?? ""
          : a?.subtipo ?? "",
        a?.lineas_pedido?.reference ?? "",
        a?.lineas_pedido?.color ?? "",
      ].join("|");

      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, a);
      } else {
        if (prev.es_estimada && !a.es_estimada) {
          seen.set(key, a);
        }
      }
    }

    const deduped = Array.from(seen.values());

    return NextResponse.json(deduped);
  } catch (err) {
    console.error("❌ Error inesperado en alertas:", err);
    return NextResponse.json(
      { error: "Error inesperado en alertas" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/alertas
 * Body: { id: string } → marca la alerta como leída (descartada)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { error: "Falta id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("alertas")
      .update({ leida: true })
      .eq("id", id);

    if (error) {
      console.error("❌ Error al descartar alerta:", error);
      return NextResponse.json(
        { error: "No se pudo descartar la alerta" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Error inesperado en PATCH alertas:", err);
    return NextResponse.json(
      { error: "Error inesperado" },
      { status: 500 }
    );
  }
}
