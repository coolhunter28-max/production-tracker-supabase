import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log("🚀 /api/compare-csv iniciado...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ============================================================
   1) Helpers
   ============================================================ */

function changed(current: any, incoming: any) {
  if (current == null && (incoming == null || incoming === "")) return false;
  return String(current ?? "").trim() !== String(incoming ?? "").trim();
}

function extractCSVDate(csvField: any): string | null {
  if (!csvField) return null;
  if (typeof csvField === "string") return csvField;
  if (typeof csvField === "object" && csvField.date) return csvField.date;
  return null;
}

// Mapea tipo interno ("cfm", "pps", etc.) a nombres posibles en BD
function matchesSampleType(dbTipo: string | null | undefined, key: string): boolean {
  if (!dbTipo) return false;
  const t = dbTipo.toLowerCase();

  switch (key) {
    case "cfm":
      return t.includes("cfm");
    case "counter_sample":
      return t.includes("counter");
    case "fitting":
      return t.includes("fitting");
    case "pps":
      return t.includes("pps");
    case "testing_sample":
      return t.includes("testing");
    case "shipping_sample":
      return t.includes("shipping");
    default:
      return false;
  }
}

/** Compara muestras de una línea */
function compareSamples(dbSamples: any[], csvLine: any) {
  const diffs: { campo: string; old: any; new: any }[] = [];
  const tipos = [
    "cfm",
    "counter_sample",
    "fitting",
    "pps",
    "testing_sample",
    "shipping_sample",
  ];

  for (const tipo of tipos) {
    const db = dbSamples.find((s) =>
      matchesSampleType(s.tipo_muestra, tipo)
    );

    const dbDate = db?.fecha_muestra || null;
    const csvDate = extractCSVDate(csvLine[tipo]);

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

/* ============================================================
   2) Handler principal
   ============================================================ */

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();
    if (!groupedPOs || !Array.isArray(groupedPOs))
      throw new Error("Datos de pedidos no válidos.");

    console.log(`🧾 Comparando archivo ${fileName} (${groupedPOs.length} POs)...`);

    const { data: dbPOs, error: dbError } = await supabase
      .from("pos")
      .select(`
        id, po, supplier, factory, customer, season,
        po_date, etd_pi, booking, closing, shipping_date,
        currency, estado_inspeccion, pi,
        lineas_pedido (
          id, reference, style, color, qty, price, amount,
          category, channel, size_run,
          trial_upper, trial_lasting, lasting, finish_date,
          muestras ( tipo_muestra, fecha_muestra )
        )
      `);

    if (dbError) throw new Error(`Error en Supabase: ${dbError.message}`);

    const dbMap = new Map(dbPOs.map((p: any) => [p.po, p]));

    let nuevos = 0;
    let modificados = 0;
    let sinCambios = 0;
    const detalles: Record<string, any> = {};

    for (const poGroup of groupedPOs) {
      const header = poGroup.header;
      const lines = poGroup.lines || [];
      const dbPO = dbMap.get(header.po);

      if (!dbPO) {
        nuevos++;
        detalles[header.po] = {
          status: "nuevo",
          cambios: [{ campo: "PO", old: "-", new: "Nuevo registro" }],
        };
        continue;
      }

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
      ];

      for (const campo of camposHeader) {
        if (changed(dbPO[campo], header[campo])) {
          cambios.push({
            campo,
            old: dbPO[campo] || "-",
            new: header[campo] || "-",
          });
        }
      }

      for (const line of lines) {
        const dbLine = dbPO.lineas_pedido.find(
          (l: any) =>
            l.reference === line.reference &&
            l.style === line.style &&
            l.color === line.color
        );

        if (!dbLine) {
          cambios.push({
            campo: `Línea nueva: ${line.reference}/${line.color}`,
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

        for (const campo of camposLinea) {
          if (changed(dbLine[campo], line[campo])) {
            cambios.push({
              campo: `${line.reference} → ${campo}`,
              old: dbLine[campo] || "-",
              new: line[campo] || "-",
            });
          }
        }

        const sampleDiffs = compareSamples(dbLine.muestras || [], line);
        cambios.push(
          ...sampleDiffs.map((s) => ({
            campo: `${line.reference} → ${s.campo}`,
            old: s.old,
            new: s.new,
          }))
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

    const resumen = {
      nuevos,
      modificados,
      sinCambios,
      detalles,
    };

    console.log(
      `📊 Resultado comparación: ${nuevos} nuevos, ${modificados} modificados, ${sinCambios} sin cambios`
    );

    return NextResponse.json(resumen);
  } catch (err: any) {
    console.error("❌ Error en /api/compare-csv:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
