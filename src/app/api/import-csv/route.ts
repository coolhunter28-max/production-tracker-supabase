// src/app/api/import-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SampleStatus = {
  needed: boolean;
  status?: string | null;
  round?: string | null;
  date?: string | null;
};

type LineData = {
  reference: string;
  style: string;
  color: string;
  qty: number;
  price: number;
  amount?: number;

  // muestras (solo estas van en `muestras`)
  cfm?: SampleStatus;
  counter_sample?: SampleStatus;
  fitting?: SampleStatus;
  pps?: SampleStatus;
  testing_sample?: SampleStatus;
  shipping_sample?: SampleStatus;
  inspection?: SampleStatus;

  // Fechas de proceso (no muestras)
  trial_upper?: SampleStatus;
  trial_lasting?: SampleStatus;
  lasting?: SampleStatus;
  finish_date?: SampleStatus;
};

type POHeader = {
  po?: string;
  supplier?: string;
  factory?: string;
  customer?: string;
  season?: string;
  channel?: string;
  po_date?: string | null;
  etd_pi?: string | null;
  booking?: string | null;
  closing?: string | null;
  shipping_date?: string | null;
  currency?: string;
  pi?: string;
  estado_inspeccion?: string;
};

type POGroup = {
  header: POHeader;
  lines: LineData[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SAMPLE_TYPES: Array<keyof LineData> = [
  "cfm",
  "counter_sample",
  "fitting",
  "pps",
  "testing_sample",
  "shipping_sample",
  "inspection",
];

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    console.log("🚀 Iniciando importación CSV");
    console.log("🧾 Archivo:", fileName);
    console.log("📦 Total POs:", groupedPOs?.length || 0);

    if (!Array.isArray(groupedPOs) || groupedPOs.length === 0) {
      return NextResponse.json({ error: "Archivo vacío o mal formateado." }, { status: 400 });
    }

    let okPOs = 0;
    let errPOs = 0;

    for (const poGroup of groupedPOs as POGroup[]) {
      const header = poGroup.header;
      const lines = Array.isArray(poGroup.lines) ? poGroup.lines : [];

      if (!header?.po) {
        console.warn("⚠️ PO sin número, ignorado.");
        errPOs++;
        continue;
      }

      // === 1️⃣ UPSERT PO ===
      const poData = {
        po: header.po,
        supplier: header.supplier ?? null,
        factory: header.factory ?? null,
        customer: header.customer ?? null,
        season: header.season ?? null,
        po_date: header.po_date ?? null,
        etd_pi: header.etd_pi ?? null,
        booking: header.booking ?? null,
        closing: header.closing ?? null,
        shipping_date: header.shipping_date ?? null,
        currency: header.currency ?? "USD",
        pi: header.pi ?? null,
        estado_inspeccion: header.estado_inspeccion ?? "-",
        channel: header.channel ?? null,
      };

      const { data: existing, error: findErr } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findErr) {
        console.error("❌ Error buscando PO:", findErr);
        errPOs++;
        continue;
      }

      let poId: string | null = null;

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("pos")
          .update(poData)
          .eq("id", existing.id);
        if (updErr) {
          console.error("❌ Error actualizando PO:", updErr);
          errPOs++;
          continue;
        }
        poId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("pos")
          .insert(poData)
          .select("id")
          .maybeSingle();
        if (insErr || !inserted) {
          console.error("❌ Error insertando PO:", insErr);
          errPOs++;
          continue;
        }
        poId = inserted.id;
      }

      if (!poId) continue;

      // === 2️⃣ Borrar e insertar líneas ===
      await supabase.from("lineas_pedido").delete().eq("po_id", poId);

      const { data: insertedLines, error: lineErr } = await supabase
        .from("lineas_pedido")
        .insert(
          lines.map((l) => ({
            po_id: poId,
            reference: l.reference ?? null,
            style: l.style ?? null,
            color: l.color ?? null,
            qty: l.qty ?? 0,
            price: l.price ?? 0,
            amount: (l.amount ?? (l.qty || 0) * (l.price || 0)) ?? 0,
          }))
        )
        .select("id");

      if (lineErr) {
        console.error("❌ Error insertando líneas:", lineErr);
        errPOs++;
        continue;
      }

      const lineIds = insertedLines?.map((l) => l.id) || [];

      // === 3️⃣ Insertar muestras ===
      for (let i = 0; i < lines.length; i++) {
        const linea = lines[i];
        const lineaId = lineIds[i];
        if (!lineaId) continue;

        const samplesToInsert: {
          linea_pedido_id: string;
          tipo_muestra: string;
          round: string;
          status: string | null;
          fecha_teorica: string | null;
          fecha_muestra: string | null; // ✅ nombre correcto
        }[] = [];

        for (const key of SAMPLE_TYPES) {
          const s = linea[key] as SampleStatus | undefined;
          if (!s) continue;

          const round = String(s.round ?? "N/N");
          const fechaMuestra = s.date ?? null;
          const status =
            s.status ??
            (s.needed === false
              ? "No need"
              : fechaMuestra
              ? "Confirmed"
              : "In progress");

          samplesToInsert.push({
            linea_pedido_id: lineaId,
            tipo_muestra: key.toUpperCase(),
            round,
            status,
            fecha_teorica: null,
            fecha_muestra: fechaMuestra,
          });
        }

        if (samplesToInsert.length > 0) {
          const { error: smpErr } = await supabase.from("muestras").insert(samplesToInsert);
          if (smpErr) console.error("❌ Error insertando muestras:", smpErr);
        }
      }

      okPOs++;
      console.log(`✅ PO ${header.po} procesado correctamente`);
    }

    return NextResponse.json({
      resumen: `Importación finalizada — ${okPOs} OK, ${errPOs} con error`,
      okPOs,
      errPOs,
    });
  } catch (err: any) {
    console.error("❌ Error general:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
