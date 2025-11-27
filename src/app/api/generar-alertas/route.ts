// src/app/api/generar-alertas/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/generar-alertas
 *
 * Genera alertas para:
 *  1️⃣ Muestras (igual que la versión estable anterior, pero solo si faltan ≤7 días)
 *  2️⃣ Producción real (Trials, Lasting, Finish) – margen 7 días
 *  3️⃣ Cabecera PO (Booking, Closing, Shipping, ETD PI) – margen 7 o 14 días
 */
export async function POST() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const alertasInsert: any[] = [];

    // ===============================================================
    // 1️⃣ MUESTRAS
    // ===============================================================
    const { data: muestras, error: errMuestras } = await supabase
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

    if (errMuestras) throw errMuestras;

    for (const m of muestras || []) {
      const est = String(m?.estado_muestra || "").trim();

      // ignorar confirmadas o No Need
      if (["Confirmed", "No Need"].includes(est)) continue;

      let fechaISO: string | null = null;
      let es_estimada = false;

      if (m?.fecha_muestra) {
        try {
          const d = new Date(m.fecha_muestra);
          fechaISO = d.toISOString().slice(0, 10);
        } catch {}
      }

      if (!fechaISO && m?.fecha_teorica) {
        try {
          const d = new Date(m.fecha_teorica);
          fechaISO = d.toISOString().slice(0, 10);
          es_estimada = true;
        } catch {}
      }

      if (!fechaISO) continue;

      const fecha = new Date(fechaISO + "T00:00:00");
      const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

      // solo alertar si faltan <=7 días o está vencida
      if (diff > 7) continue;

      const po = m?.lineas_pedido?.pos?.po || "";
      const ref = m?.lineas_pedido?.reference || "";
      const style = m?.lineas_pedido?.style || "";
      const color = m?.lineas_pedido?.color || "";
      const tipo = String(m?.tipo_muestra || "").trim();
      const parteLinea = [ref, style, color].filter(Boolean).join(" · ");

      const msg =
        diff < 0
          ? `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} con ${Math.abs(
              diff
            )} día(s) de retraso para PO ${po}.`
          : diff === 0
          ? `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence hoy para PO ${po}.`
          : `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence en ${diff} día(s) para PO ${po}.`;

      alertasInsert.push({
        tipo: "muestra",
        subtipo: tipo || null,
        fecha: fechaISO,
        severidad: diff < 0 ? "alta" : "baja",
        mensaje: msg,
        es_estimada,
        leida: false,
        po_id: m?.lineas_pedido?.pos?.id || null,
        linea_pedido_id: m?.linea_pedido_id || m?.lineas_pedido?.id || null,
        muestra_id: m?.id || null,
      });
    }

    // ===============================================================
    // 2️⃣ PRODUCCIÓN REAL (Trials / Lasting / Finish)
    // ===============================================================
    const { data: lineas, error: errLineas } = await supabase
      .from("lineas_pedido")
      .select(`
        id,
        po_id,
        trial_upper,
        trial_lasting,
        lasting,
        finish_date,
        pos:pos(po)
      `);

    if (errLineas) throw errLineas;

    for (const l of lineas || []) {
      const fases = [
        { key: "trial_upper", label: "Trial U" },
        { key: "trial_lasting", label: "Trial L" },
        { key: "lasting", label: "Lasting" },
        { key: "finish_date", label: "Finish" },
      ];

      for (const f of fases) {
        const fecha = l[f.key];
        if (!fecha) continue;

        const d = new Date(fecha);
        const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);

        // solo alertar si faltan <=7 días o vencidas
        if (diff > 7) continue;

        const po = l?.pos?.po || "";
        const msg =
          diff < 0
            ? `${f.label} del PO ${po} con ${Math.abs(diff)} día(s) de retraso.`
            : diff === 0
            ? `${f.label} del PO ${po} es hoy.`
            : `${f.label} del PO ${po} faltan ${diff} día(s).`;

        alertasInsert.push({
          tipo: "produccion",
          subtipo: f.label,
          fecha: d.toISOString().slice(0, 10),
          severidad: diff < 0 ? "alta" : "baja",
          mensaje: msg,
          es_estimada: false,
          leida: false,
          po_id: l.po_id,
          linea_pedido_id: l.id,
          muestra_id: null,
        });
      }
    }

    // ===============================================================
    // 3️⃣ CABECERA PO (Booking, Closing, Shipping, ETD PI)
    // ===============================================================
    const { data: pos, error: errPOs } = await supabase
      .from("pos")
      .select("id, po, booking, closing, shipping_date, etd_pi");

    if (errPOs) throw errPOs;

    for (const po of pos || []) {
      const campos = [
        { key: "booking", label: "Booking", margen: 7 },
        { key: "closing", label: "Closing", margen: 7 },
        { key: "shipping_date", label: "Shipping", margen: 7 },
        { key: "etd_pi", label: "ETD PI", margen: 14 },
      ];

      for (const c of campos) {
        const fecha = po[c.key];
        if (!fecha) continue;

        const d = new Date(fecha);
        const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
        if (diff > c.margen) continue;

        const msg =
          diff < 0
            ? `${c.label} del PO ${po.po} con ${Math.abs(diff)} día(s) de retraso.`
            : diff === 0
            ? `${c.label} del PO ${po.po} es hoy.`
            : `${c.label} del PO ${po.po} faltan ${diff} día(s).`;

        alertasInsert.push({
          tipo: "ETD",
          subtipo: c.label,
          fecha: d.toISOString().slice(0, 10),
          severidad: diff < 0 ? "alta" : "baja",
          mensaje: msg,
          es_estimada: false,
          leida: false,
          po_id: po.id,
          linea_pedido_id: null,
          muestra_id: null,
        });
      }
    }

    // ===============================================================
    // INSERT / UPSERT
    // ===============================================================
    // Borramos alertas previas para evitar duplicados (puedes dejar solo las del tipo que quieras limpiar)
    await supabase.from("alertas").delete().neq("tipo", "permanente");

    if (alertasInsert.length > 0) {
      await supabase.from("alertas").insert(alertasInsert);
    }

    return NextResponse.json({
      success: true,
      total: alertasInsert.length,
      message: "Alertas generadas correctamente (muestras + producción + etd)",
    });
  } catch (e: any) {
    console.error("❌ Error en generar-alertas:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
