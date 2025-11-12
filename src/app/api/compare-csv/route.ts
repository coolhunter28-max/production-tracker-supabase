// src/app/api/compare-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log("🚀 /api/compare-csv iniciado...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Comparador simple */
function changed(current: any, incoming: any) {
  if (current == null && (incoming == null || incoming === "")) return false;
  return String(current ?? "").trim() !== String(incoming ?? "").trim();
}

/** Comparar muestras */
function compareSamples(dbSamples: any[], csvLine: any) {
  const diffs: { campo: string; old: any; new: any }[] = [];
  const tipos = [
    "cfm",
    "pps",
    "testing_sample",
    "shipping_sample",
    "inspection",
  ];

  for (const tipo of tipos) {
    const db = dbSamples.find(
      (s) => s.tipo_muestra?.toLowerCase() === tipo.toLowerCase()
    );
    const csv = csvLine[tipo];
    const dbDate = db?.fecha_muestra || null;
    const csvDate = csv?.date || csv?.fecha_muestra || csv || null;
    if (changed(dbDate, csvDate)) {
      diffs.push({
        campo: tipo.toUpperCase(),
        old: dbDate || "-",
        new: csvDate || "-",
      });
    }
  }
  return diffs;
}

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();
    if (!groupedPOs || !Array.isArray(groupedPOs))
      throw new Error("Datos de pedidos no válidos.");

    console.log(`🧾 Comparando archivo ${fileName} (${groupedPOs.length} POs)...`);

    // === Obtener todos los POs con líneas y muestras ===
    const { data: dbPOs, error: dbError } = await supabase
      .from("pos")
      .select(`
        id, po, supplier, factory, customer, season, po_date,
        etd_pi, booking, closing, shipping_date, currency,
        estado_inspeccion, pi, channel,
        lineas_pedido (
          id, reference, style, color, qty, price, amount,
          category, trial_upper, trial_lasting, lasting, finish_date,
          muestras ( tipo_muestra, fecha_muestra )
        )
      `);

    if (dbError) throw new Error(`Error en Supabase: ${dbError.message}`);

    const dbMap = new Map(dbPOs.map((p) => [p.po, p]));

    let nuevos = 0;
    let modificados = 0;
    let sinCambios = 0;
    const detalles: Record<string, any> = {};

    for (const po of groupedPOs) {
      const header = po.header;
      const lines = po.lines || [];
      const dbPO = dbMap.get(header.po);

      // === Caso 1: Nuevo PO ===
      if (!dbPO) {
        nuevos++;
        detalles[header.po] = {
          status: "nuevo",
          cambios: [{ campo: "PO nuevo", old: "-", new: "Nuevo registro" }],
        };
        continue;
      }

      // === Comparar cabecera ===
      const cambios: { campo: string; old: any; new: any }[] = [];
      const camposHeader = [
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
      for (const f of camposHeader) {
        if (changed(dbPO[f], header[f])) {
          cambios.push({
            campo: f,
            old: dbPO[f] || "-",
            new: header[f] || "-",
          });
        }
      }

      // === Comparar líneas ===
      for (const line of lines) {
        const dbLine = dbPO.lineas_pedido.find(
          (l: any) =>
            l.reference === line.reference &&
            l.style === line.style &&
            l.color === line.color
        );

        if (!dbLine) {
          cambios.push({
            campo: `Línea nueva → ${line.reference}/${line.color}`,
            old: "-",
            new: "Nueva línea",
          });
          continue;
        }

        const camposLinea = [
          "qty",
          "price",
          "amount",
          "trial_upper",
          "trial_lasting",
          "lasting",
          "finish_date",
        ];
        for (const f of camposLinea) {
          if (changed(dbLine[f], line[f])) {
            cambios.push({
              campo: `${line.reference} → ${f}`,
              old: dbLine[f] || "-",
              new: line[f] || "-",
            });
          }
        }

        // === Muestras ===
        const sampleDiffs = compareSamples(dbLine.muestras || [], line);
        sampleDiffs.forEach((s) =>
          cambios.push({
            campo: `${line.reference} → ${s.campo}`,
            old: s.old,
            new: s.new,
          })
        );
      }

      if (cambios.length > 0) {
        modificados++;
        detalles[header.po] = { status: "modificado", cambios };
      } else {
        sinCambios++;
        detalles[header.po] = { status: "sin_cambios" };
      }
    }

    const resumen = { nuevos, modificados, sinCambios, detalles };
    console.log(
      `📊 Resultado: ${nuevos} nuevos, ${modificados} modificados, ${sinCambios} sin cambios`
    );

    return NextResponse.json(resumen);
  } catch (err: any) {
    console.error("❌ Error en /api/compare-csv:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
