// src/app/api/compare-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log("🚀 /api/compare-csv iniciado...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🧩 Comparador de campos simples
function compareField(current: any, incoming: any) {
  if (current == null && (incoming == null || incoming === "")) return false;
  if (current === incoming) return false;
  return true;
}

// 🧩 Comparar muestras
function compareSamples(dbSamples: any[], csvLine: any) {
  const result: any[] = [];
  const sampleTypes = [
    "cfm",
    "pps",
    "testing_sample",
    "shipping_sample",
    "inspection",
  ];

  for (const type of sampleTypes) {
    const dbSample = dbSamples.find(
      (s) => s.tipo_muestra?.toLowerCase() === type.toLowerCase()
    );
    const csvSample = csvLine[type];
    const dbDate = dbSample?.fecha_muestra || null;
    const csvDate = csvSample?.date || null;

    if (compareField(dbDate, csvDate)) {
      result.push({
        tipo: type.toUpperCase(),
        antes: dbDate,
        despues: csvDate,
      });
    }
  }

  return result;
}

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    if (!groupedPOs || !Array.isArray(groupedPOs)) {
      throw new Error("Datos de pedidos no válidos o vacíos.");
    }

    console.log(`🧾 Comparando archivo ${fileName} con ${groupedPOs.length} POs del CSV...`);

    // 1️⃣ Obtener todos los POs + líneas + muestras
    const { data: dbPOs, error: dbError } = await supabase
      .from("pos")
      .select(`
        id,
        po,
        supplier,
        factory,
        customer,
        season,
        po_date,
        etd_pi,
        booking,
        closing,
        shipping_date,
        currency,
        estado_inspeccion,
        pi,
        channel,
        lineas_pedido (
          id,
          reference,
          style,
          color,
          qty,
          price,
          amount,
          category,
          trial_upper,
          trial_lasting,
          lasting,
          finish_date,
          muestras (
            tipo_muestra,
            fecha_muestra
          )
        )
      `);

    if (dbError) throw new Error(`Error obteniendo datos de Supabase: ${dbError.message}`);

    const dbMap = new Map(dbPOs.map((po) => [po.po, po]));

    let nuevos = 0;
    let modificados = 0;
    let sinCambios = 0;
    const detalle: any[] = [];

    // 2️⃣ Comparar cada PO del CSV
    for (const po of groupedPOs) {
      const header = po.header;
      const lines = po.lines || [];

      const existingPO = dbMap.get(header.po);
      if (!existingPO) {
        nuevos++;
        detalle.push({ po: header.po, tipo: "nuevo", cambios: ["PO nuevo no existente en DB"] });
        continue;
      }

      const headerChanges: string[] = [];
      const fieldsToCompare = [
        "supplier",
        "factory",
        "customer",
        "season",
        "po_date",
        "etd_pi",
        "booking",
        "closing",
        "shipping_date",
        "currency",
        "estado_inspeccion",
        "pi",
        "channel",
      ];

      fieldsToCompare.forEach((f) => {
        if (compareField(existingPO[f], header[f])) {
          headerChanges.push(`${f}: ${existingPO[f]} → ${header[f]}`);
        }
      });

      const lineChanges: any[] = [];
      for (const csvLine of lines) {
        const dbLine = existingPO.lineas_pedido.find(
          (l: any) =>
            l.reference === csvLine.reference &&
            l.style === csvLine.style &&
            l.color === csvLine.color
        );

        if (!dbLine) {
          lineChanges.push({
            linea: `${csvLine.reference} / ${csvLine.style}`,
            cambios: ["Línea nueva no existente en DB"],
          });
          continue;
        }

        const diffs: string[] = [];

        if (compareField(dbLine.qty, csvLine.qty))
          diffs.push(`qty: ${dbLine.qty} → ${csvLine.qty}`);
        if (compareField(dbLine.price, csvLine.price))
          diffs.push(`price: ${dbLine.price} → ${csvLine.price}`);
        if (compareField(dbLine.amount, csvLine.amount))
          diffs.push(`amount: ${dbLine.amount} → ${csvLine.amount}`);

        const sampleDiffs = compareSamples(dbLine.muestras || [], csvLine);
        sampleDiffs.forEach((s) =>
          diffs.push(`${s.tipo}: ${s.antes || "-"} → ${s.despues || "-"}`)
        );

        if (diffs.length > 0) {
          lineChanges.push({
            linea: `${csvLine.reference} / ${csvLine.color}`,
            cambios: diffs,
          });
        }
      }

      if (headerChanges.length > 0 || lineChanges.length > 0) {
        modificados++;
        detalle.push({
          po: header.po,
          tipo: "modificado",
          headerChanges,
          lineChanges,
        });
      } else {
        sinCambios++;
      }
    }

    const resumen = { nuevos, modificados, sinCambios, detalle };
    console.log(`📊 Comparación finalizada: ${nuevos} nuevos, ${modificados} modificados, ${sinCambios} sin cambios`);

    return NextResponse.json(resumen);
  } catch (err: any) {
    console.error("❌ Error en /api/compare-csv:", err.message);
    return NextResponse.json(
      { error: err.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
