import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Definimos el tipo de datos que esperamos
type AlertaRow = {
  id: string;
  tipo: string;
  subtipo?: string | null;
  severidad?: string | null;
  fecha: string;
  es_estimada: boolean;
  leida: boolean;
  pos?: { po: string; customer: string } | { po: string; customer: string }[];
  lineas_pedido?: { reference?: string; style?: string; color?: string };
  muestras?: { tipo_muestra?: string | null };
};

/**
 * GET /api/alertas?leida=false
 * Devuelve alertas deduplicadas con joins mínimos para el dashboard
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leida = searchParams.get("leida");

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
      .eq("leida", leida === "true")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("❌ Error en la consulta de alertas:", error);
      return NextResponse.json(
        { error: "Error al obtener las alertas" },
        { status: 500 }
      );
    }

    const rows = (Array.isArray(data) ? data : []) as AlertaRow[];

    // De-duplicado (preferimos no estimadas frente a estimadas)
    const seen = new Map<string, any>();
    for (const a of rows) {
      const poNumber = Array.isArray(a.pos)
        ? a.pos[0]?.po ?? ""
        : a.pos?.po ?? "";
      const customer = Array.isArray(a.pos)
        ? a.pos[0]?.customer ?? ""
        : a.pos?.customer ?? "";

      const key = [
        poNumber,
        a?.tipo ?? "",
        a?.tipo === "muestra"
          ? a?.muestras?.tipo_muestra ?? ""
          : a?.subtipo ?? "",
        a?.lineas_pedido?.reference ?? "",
        a?.lineas_pedido?.color ?? "",
      ].join("|");

      const normalizado = {
        ...a,
        pos: { po: poNumber, customer },
      };

      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, normalizado);
      } else {
        if (prev.es_estimada && !a.es_estimada) {
          seen.set(key, normalizado);
        }
      }
    }

    return NextResponse.json(Array.from(seen.values()));
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
 * Body: { id: string }  → marca la alerta como leída (descartada)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
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
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
