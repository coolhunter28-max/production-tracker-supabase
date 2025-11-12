// src/app/api/generar-alertas/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/generar-alertas
 * Genera alertas de “muestra” para todas las muestras que:
 *  - NO están Confirmed
 *  - Y NO están marcadas como No Need
 * Usa fecha real si existe (es_estimada=false); si no, usa fecha_teorica (es_estimada=true).
 * Evita duplicados con upsert por muestra_id (UNIQUE).
 */
export async function POST() {
  try {
    // 1) Leemos muestras con su contexto (línea y PO) para componer el mensaje
    const { data: muestras, error } = await supabase
      .from("muestras")
      .select(`
        id,
        linea_pedido_id,
        tipo_muestra,
        round,
        fecha_muestra,
        fecha_teorica,
        estado_muestra,
        lineas_pedido:lineas_pedido (
          id,
          po_id,
          reference,
          style,
          color,
          pos:pos (
            id,
            po,
            customer
          )
        )
      `);

    if (error) {
      console.error("❌ Error leyendo muestras:", error);
      return NextResponse.json({ success: false, error: "Error leyendo muestras" }, { status: 500 });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 2) Preparamos alertas SOLO para estados relevantes
    const toInsert: any[] = [];

    (muestras || []).forEach((m: any) => {
      const est = String(m?.estado_muestra || "").trim();

      // 🔒 Ignorar confirmadas y “No Need”
      if (est === "Confirmed" || est === "No Need") return;

      // Determinar fecha / estimación
      let fechaISO: string | null = null;
      let es_estimada = false;

      if (m?.fecha_muestra) {
        // Fecha real existente → no estimada
        try {
          const d = new Date(m.fecha_muestra);
          fechaISO = d.toISOString().slice(0, 10);
          es_estimada = false;
        } catch {
          fechaISO = null;
        }
      }

      if (!fechaISO && m?.fecha_teorica) {
        // Si no hay real, usar teórica (estimada)
        try {
          const d = new Date(m.fecha_teorica);
          fechaISO = d.toISOString().slice(0, 10);
          es_estimada = true;
        } catch {
          fechaISO = null;
        }
      }

      // Si no tenemos ninguna fecha, no generamos alerta (no tendríamos qué mostrar)
      if (!fechaISO) return;

      // Severidad según retraso relativo a hoy
      const d = new Date(fechaISO + "T00:00:00");
      const diffDays = Math.round((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      const severidad =
        diffDays < -7 ? "alta" : diffDays < 0 ? "media" : "baja";

      const po = m?.lineas_pedido?.pos?.po || "";
      const customer = m?.lineas_pedido?.pos?.customer || "";
      const ref = m?.lineas_pedido?.reference || "";
      const style = m?.lineas_pedido?.style || "";
      const color = m?.lineas_pedido?.color || "";
      const tipo = String(m?.tipo_muestra || "").trim();

      // Mensaje (legible)
      let msg: string;
      const parteLinea = [ref, style, color].filter(Boolean).join(" · ");
      if (diffDays < 0) {
        msg = `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} con ${Math.abs(diffDays)} día(s) de retraso para PO ${po}.`;
      } else if (diffDays === 0) {
        msg = `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence hoy para PO ${po}.`;
      } else {
        msg = `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence en ${diffDays} día(s) para PO ${po}.`;
      }

      toInsert.push({
        // Campos obligatorios
        tipo: "muestra",
        subtipo: tipo || null,
        fecha: fechaISO, // DATE (solo yyyy-mm-dd)
        severidad,
        mensaje: msg,
        es_estimada,
        leida: false,

        // Relaciones
        po_id: m?.lineas_pedido?.pos?.id || null,
        linea_pedido_id: m?.linea_pedido_id || m?.lineas_pedido?.id || null,

        // Evita duplicados por muestra (la tabla alertas tiene UNIQUE en muestra_id)
        muestra_id: m?.id || null,
      });
    });

    if (!toInsert.length) {
      return NextResponse.json({ success: true, count: 0, info: "No había muestras pendientes de alertar" });
    }

    // 3) Upsert para no duplicar: onConflict por muestra_id (UNIQUE)
    const { error: upErr, data: inserted } = await supabase
      .from("alertas")
      .upsert(toInsert, { onConflict: "muestra_id", ignoreDuplicates: true })
      .select("id");

    if (upErr) {
      console.error("❌ Error insertando alertas:", upErr);
      return NextResponse.json({ success: false, error: "Error insertando alertas" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length ?? 0,
    });
  } catch (e: any) {
    console.error("❌ Error inesperado en generar-alertas:", e);
    return NextResponse.json({ success: false, error: "Error inesperado" }, { status: 500 });
  }
}
