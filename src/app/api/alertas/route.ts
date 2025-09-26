// src/app/api/alertas/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 🔹 Deduplicar alertas por clave (PO + tipo + subtipo + ref + color)
function dedupeAlertas(alertas: any[]) {
  const map = new Map<string, any>();

  for (const a of alertas) {
    const key = [
      a.po,
      a.tipo,
      a.subtipo,
      a.reference,
      a.color,
    ].join("|");

    if (!map.has(key)) {
      map.set(key, a);
    } else {
      const existente = map.get(key);
      // Priorizar alerta real sobre estimada
      if (existente.es_estimada && !a.es_estimada) {
        map.set(key, a);
      }
    }
  }

  return Array.from(map.values());
}

// ==========================
// GET: Listar alertas
// ==========================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leida = searchParams.get("leida");

  let query = supabase
    .from("alertas")
    .select(
      `
      id,
      tipo,
      subtipo,
      severidad,
      fecha,
      es_estimada,
      leida,
      pos (po, customer),
      lineas_pedido (reference, style, color),
      muestras (tipo_muestra)
    `
    )
    .order("fecha", { ascending: true });

  if (leida !== null) {
    query = query.eq("leida", leida === "true");
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error cargando alertas:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Normalizar alertas (manejar arrays de relaciones)
  const alertas = data.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    subtipo: a.subtipo ?? (a.muestras?.[0]?.tipo_muestra ?? null),
    severidad: a.severidad,
    fecha: a.fecha,
    es_estimada: a.es_estimada,
    leida: a.leida,
    po: Array.isArray(a.pos) ? a.pos[0]?.po ?? "-" : a.pos?.po ?? "-",
    customer: Array.isArray(a.pos) ? a.pos[0]?.customer ?? "-" : a.pos?.customer ?? "-",
    reference: Array.isArray(a.lineas_pedido) ? a.lineas_pedido[0]?.reference ?? "-" : a.lineas_pedido?.reference ?? "-",
    style: Array.isArray(a.lineas_pedido) ? a.lineas_pedido[0]?.style ?? "-" : a.lineas_pedido?.style ?? "-",
    color: Array.isArray(a.lineas_pedido) ? a.lineas_pedido[0]?.color ?? "-" : a.lineas_pedido?.color ?? "-",
    mensaje:
      a.tipo === "muestra"
        ? `Muestra ${a.subtipo ?? a.muestras?.[0]?.tipo_muestra ?? "-"} pendiente`
        : `Alerta de ${a.subtipo ?? a.tipo}`,
  }));

  const deduped = dedupeAlertas(alertas);

  return NextResponse.json({ success: true, alertas: deduped });
}

// ==========================
// PATCH: Marcar alerta como leída
// ==========================
export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    const { error } = await supabase
      .from("alertas")
      .update({ leida: true })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error en PATCH /api/alertas:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
