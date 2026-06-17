import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = await createClient();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const alertasInsert: any[] = [];

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
        lineas_pedido:linea_pedido_id (
          id,
          po_id,
          reference,
          style,
          color,
          pos:po_id (
            id,
            po,
            customer
          )
        )
      `);

    if (errMuestras) throw errMuestras;

    for (const rawMuestra of muestras ?? []) {
      const m: any = rawMuestra;
      const linea: any = m.lineas_pedido;
      const po: any = linea?.pos;

      const estado = String(m.estado_muestra ?? "").trim();

      if (["Confirmed", "No Need", "N/N"].includes(estado)) continue;

      let fechaISO: string | null = null;
      let esEstimada = false;

      if (m.fecha_muestra) {
        fechaISO = new Date(m.fecha_muestra).toISOString().slice(0, 10);
      }

      if (!fechaISO && m.fecha_teorica) {
        fechaISO = new Date(m.fecha_teorica).toISOString().slice(0, 10);
        esEstimada = true;
      }

      if (!fechaISO) continue;

      const fecha = new Date(`${fechaISO}T00:00:00`);
      const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

      if (diff > 7) continue;

      const tipo = String(m.tipo_muestra ?? "").trim();
      const parteLinea = [linea?.reference, linea?.style, linea?.color]
        .filter(Boolean)
        .join(" · ");

      const poNumber = po?.po ?? "";

      const mensaje =
        diff < 0
          ? `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} con ${Math.abs(diff)} día(s) de retraso para PO ${poNumber}.`
          : diff === 0
            ? `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence hoy para PO ${poNumber}.`
            : `Muestra ${tipo}${parteLinea ? ` (${parteLinea})` : ""} vence en ${diff} día(s) para PO ${poNumber}.`;

      alertasInsert.push({
        tipo: "muestra",
        subtipo: tipo || null,
        fecha: fechaISO,
        severidad: diff < 0 ? "alta" : "baja",
        mensaje,
        es_estimada: esEstimada,
        leida: false,
        po_id: po?.id ?? null,
        linea_pedido_id: m.linea_pedido_id ?? linea?.id ?? null,
        muestra_id: m.id ?? null,
      });
    }

    const { data: lineas, error: errLineas } = await supabase
      .from("lineas_pedido")
      .select(`
        id,
        po_id,
        trial_upper,
        trial_lasting,
        lasting,
        finish_date,
        pos:po_id (
          id,
          po
        )
      `);

    if (errLineas) throw errLineas;

    for (const rawLinea of lineas ?? []) {
      const l: any = rawLinea;
      const po: any = l.pos;

      const fases = [
        { key: "trial_upper", label: "Trial U" },
        { key: "trial_lasting", label: "Trial L" },
        { key: "lasting", label: "Lasting" },
        { key: "finish_date", label: "Finish" },
      ] as const;

      for (const fase of fases) {
        const fechaValor = l[fase.key];
        if (!fechaValor) continue;

        const fecha = new Date(fechaValor);
        const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

        if (diff > 7) continue;

        const poNumber = po?.po ?? "";

        const mensaje =
          diff < 0
            ? `${fase.label} del PO ${poNumber} con ${Math.abs(diff)} día(s) de retraso.`
            : diff === 0
              ? `${fase.label} del PO ${poNumber} es hoy.`
              : `${fase.label} del PO ${poNumber} faltan ${diff} día(s).`;

        alertasInsert.push({
          tipo: "produccion",
          subtipo: fase.label,
          fecha: fecha.toISOString().slice(0, 10),
          severidad: diff < 0 ? "alta" : "baja",
          mensaje,
          es_estimada: false,
          leida: false,
          po_id: l.po_id,
          linea_pedido_id: l.id,
          muestra_id: null,
        });
      }
    }

    const { data: pos, error: errPOs } = await supabase
      .from("pos")
      .select("id, po, booking, closing, shipping_date, etd_pi");

    if (errPOs) throw errPOs;

    for (const rawPO of pos ?? []) {
      const po: any = rawPO;

      const campos = [
        { key: "booking", label: "Booking", margen: 7 },
        { key: "closing", label: "Closing", margen: 7 },
        { key: "shipping_date", label: "Shipping", margen: 7 },
        { key: "etd_pi", label: "ETD PI", margen: 14 },
      ] as const;

      for (const campo of campos) {
        const fechaValor = po[campo.key];
        if (!fechaValor) continue;

        const fecha = new Date(fechaValor);
        const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

        if (diff > campo.margen) continue;

        const mensaje =
          diff < 0
            ? `${campo.label} del PO ${po.po} con ${Math.abs(diff)} día(s) de retraso.`
            : diff === 0
              ? `${campo.label} del PO ${po.po} es hoy.`
              : `${campo.label} del PO ${po.po} faltan ${diff} día(s).`;

        alertasInsert.push({
          tipo: "ETD",
          subtipo: campo.label,
          fecha: fecha.toISOString().slice(0, 10),
          severidad: diff < 0 ? "alta" : "baja",
          mensaje,
          es_estimada: false,
          leida: false,
          po_id: po.id,
          linea_pedido_id: null,
          muestra_id: null,
        });
      }
    }

    const { error: deleteError } = await supabase
      .from("alertas")
      .delete()
      .neq("tipo", "permanente");

    if (deleteError) throw deleteError;

    if (alertasInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("alertas")
        .insert(alertasInsert);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      total: alertasInsert.length,
      message: "Alertas generadas correctamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("❌ Error en generar-alertas:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}