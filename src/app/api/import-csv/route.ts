// src/app/api/import-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SampleStatus = {
  needed?: boolean;
  status?: string | null;
  round?: string | null;
  date?: string | null;
  notes?: string | null;
};

type LineData = {
  reference: string;
  style: string;
  color: string;
  size_run?: string | null;
  category?: string | null;
  channel?: string | null;
  qty: number;
  price: number;
  amount?: number;
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;

  cfm?: SampleStatus | string | null;
  counter_sample?: SampleStatus | string | null;
  fitting?: SampleStatus | string | null;
  pps?: SampleStatus | string | null;
  testing_sample?: SampleStatus | string | null;
  shipping_sample?: SampleStatus | string | null;
  inspection?: SampleStatus | string | null;
};

type POHeader = {
  po: string;
  supplier?: string | null;
  factory?: string | null;
  customer?: string | null;
  season?: string | null;
  po_date?: string | null;
  etd_pi?: string | null;
  booking?: string | null;
  closing?: string | null;
  shipping_date?: string | null;
  currency?: string | null;
  pi?: string | null;
  estado_inspeccion?: string | null;
};

type POGroup = {
  header: POHeader;
  lines: LineData[];
};

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName, compareResult } = await req.json();

    console.log("🚀 Iniciando importación desde CSV:", fileName);
    let ok = 0;
    let err = 0;

    // 📊 Mostrar resumen de comparación si existe
    if (compareResult?.resumen) {
      console.log("📊 Resumen previo:");
      console.table({
        Nuevos: compareResult.resumen.nuevos || 0,
        Modificados: compareResult.resumen.modificados || 0,
        SinCambios: compareResult.resumen.sinCambios || 0,
      });
    }

    for (const poGroup of groupedPOs as POGroup[]) {
      const { header, lines } = poGroup;
      const estadoPO = compareResult?.detalles?.[header.po]?.status || "nuevo";

      // 1️⃣ Buscar o crear el PO
      const { data: existing, error: findErr } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findErr) {
        console.error("❌ Buscar PO:", findErr);
        err++;
        continue;
      }

      let poId: string;

      if (existing?.id) {
        const cleanHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) =>
              v !== null &&
              v !== "" &&
              !["category", "channel", "size_run"].includes(k)
          )
        );

        const { error: updErr } = await supabase
          .from("pos")
          .update(cleanHeader)
          .eq("id", existing.id);

        if (updErr) {
          console.error("❌ Actualizar PO:", updErr);
          err++;
          continue;
        }

        poId = existing.id;
      } else {
        const insertHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) =>
              v !== null &&
              v !== "" &&
              !["category", "channel", "size_run"].includes(k)
          )
        );

        const { data: inserted, error: insErr } = await supabase
          .from("pos")
          .insert(insertHeader)
          .select("id")
          .maybeSingle();

        if (insErr || !inserted) {
          console.error("❌ Insertar PO:", insErr);
          err++;
          continue;
        }

        poId = inserted.id;
      }

      // 2️⃣ Borrar líneas y muestras antiguas si es modificado
      if (estadoPO === "modificado") {
        const { data: oldLines } = await supabase
          .from("lineas_pedido")
          .select("id")
          .eq("po_id", poId);

        if (oldLines?.length) {
          const lineIds = oldLines.map((l) => l.id);
          await supabase.from("muestras").delete().in("linea_pedido_id", lineIds);
          await supabase.from("lineas_pedido").delete().in("id", lineIds);
        }
      }

      // 3️⃣ Insertar nuevas líneas
      const { data: insertedLines, error: lineErr } = await supabase
        .from("lineas_pedido")
        .insert(
          lines.map((l) => ({
            po_id: poId,
            reference: l.reference,
            style: l.style,
            color: l.color,
            size_run: l.size_run,
            category: l.category,
            channel: l.channel,
            qty: l.qty,
            price: l.price,
            amount: l.amount,
            trial_upper: l.trial_upper,
            trial_lasting: l.trial_lasting,
            lasting: l.lasting,
            finish_date: l.finish_date,
          }))
        )
        .select("id, reference, style, color");

      if (lineErr || !insertedLines) {
        console.error("⚠️ Error insertando líneas:", lineErr);
        err++;
        continue;
      }

      // 4️⃣ Insertar muestras (sin po_id)
      const samplesToInsert: any[] = [];
      const sampleTypes = [
        "cfm",
        "counter_sample",
        "fitting",
        "pps",
        "testing_sample",
        "shipping_sample",
        "inspection",
      ];

      for (const insertedLine of insertedLines) {
        const line = lines.find(
          (l) =>
            l.reference === insertedLine.reference &&
            l.style === insertedLine.style &&
            l.color === insertedLine.color
        );
        if (!line) continue;

        for (const type of sampleTypes) {
          const s = (line as any)[type];
          if (!s) continue;

          let fecha = null;
          let estado = "pendiente";
          let round = "N/A";
          let notas = null;

          if (typeof s === "string") {
            fecha = s;
          } else {
            fecha = s.date || null;
            estado = s.status || "pendiente";
            round = s.round || "N/A";
            notas = s.notes || null;
          }

          if (fecha) {
            samplesToInsert.push({
              linea_pedido_id: insertedLine.id,
              tipo_muestra: type.toUpperCase(),
              fecha_muestra: fecha,
              estado_muestra: estado,
              round,
              notas,
            });
          }
        }
      }

      if (samplesToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("muestras")
          .insert(samplesToInsert);
        if (insErr) console.error("⚠️ Error insertando muestras:", insErr);
      }

      // 5️⃣ Actualizar total de muestras
      const { count } = await supabase
        .from("muestras")
        .select("*", { count: "exact", head: true })
        .in(
          "linea_pedido_id",
          (await supabase
            .from("lineas_pedido")
            .select("id")
            .eq("po_id", poId)).data?.map((l) => l.id) || []
        );

      await supabase
        .from("pos")
        .update({ total_muestras: count || 0 })
        .eq("id", poId);

      ok++;
    }

    // 6️⃣ Registrar importación
    await supabase.from("importaciones").insert({
      nombre_archivo: fileName,
      cantidad_registros: groupedPOs.length,
      estado: err > 0 ? "parcial" : "completado",
      datos: { ok, err },
    });

    console.log(`✅ Importación completada: ${ok} OK, ${err} errores.`);
    return NextResponse.json({ resumen: { ok, err } });
  } catch (error: any) {
    console.error("❌ Error general en importación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
