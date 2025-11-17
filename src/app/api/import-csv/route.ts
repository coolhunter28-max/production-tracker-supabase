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

  // Fechas reales de las muestras (desde csv-utils)
  cfm?: string | null;
  counter_sample?: string | null;
  fitting?: string | null;
  pps?: string | null;
  testing_sample?: string | null;
  shipping_sample?: string | null;

  // Round originales del Excel (Round 1, N/N, etc.)
  cfm_round?: string | null;
  counter_round?: string | null;
  fitting_round?: string | null;
  pps_round?: string | null;
  testing_round?: string | null;
  shipping_round?: string | null;
};

type POHeader = {
  po: string;
  supplier?: string | null;
  factory?: string | null;
  customer?: string | null;
  season?: string | null;
  category?: string | null;
  channel?: string | null;
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

//
// ======================================================
//   🔵 HELPERS
// ======================================================
//

// Extrae sólo el número de "Round 1", "ROUND2", etc.
function extractRoundNumber(v: string | null | undefined): string {
  if (!v) return "N/A";
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "N/N") return "N/A";
  const match = s.match(/\d+/);
  return match ? match[0] : "N/A";
}

// Devuelve true si el Round significa que la muestra SE NECESITA
function isNeededRound(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = String(v).trim().toUpperCase();
  if (!s || s === "N/N" || s === "NO" || s === "NONE") return false;
  return true;
}

// Suma días a una fecha YYYY-MM-DD
function addDays(base: string, days: number): string | null {
  if (!base) return null;
  const d = new Date(base + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Resta días a una fecha YYYY-MM-DD
function subDays(base: string, days: number): string | null {
  return addDays(base, -days);
}

// Calcula fecha teórica según tipo de muestra
function calcFechaTeorica(
  tipo: string,
  po_date: string | null | undefined,
  finish_date: string | null | undefined
): string | null {
  const poD = po_date || null;
  const finD = finish_date || null;

  switch (tipo) {
    case "CFMS":
    case "CFM":
      return poD ? addDays(poD, 25) : null;

    case "COUNTERS":
    case "COUNTER_SAMPLE":
    case "COUNTER":
      return poD ? addDays(poD, 10) : null;

    case "FITTINGS":
    case "FITTING":
      return poD ? addDays(poD, 25) : null;

    case "PPS":
      return poD ? addDays(poD, 45) : null;

    case "TESTINGS":
    case "TESTING_SAMPLE":
    case "TESTING":
      return finD ? subDays(finD, 14) : null;

    case "SHIPPINGS":
    case "SHIPPING_SAMPLE":
    case "SHIPPING":
      return finD ? subDays(finD, 7) : null;

    default:
      return null;
  }
}

// Decide estado inicial según fecha real / teórica
function calcEstado(
  fechaReal: string | null,
  fechaTeorica: string | null
): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaReal) {
    const d = new Date(fechaReal + "T00:00:00");
    if (!isNaN(d.getTime()) && d.getTime() < hoy.getTime()) {
      return "enviada";
    }
    return "pendiente";
  }

  // Sin fecha real → siempre pendiente (aunque tenga teórica)
  return "pendiente";
}

// Construye un registro de muestra listo para insertar en Supabase
function buildSampleRecord(
  tipo: string,
  line: LineData,
  header: POHeader
) {
  // Mapear tipo lógico a campos de la línea
  let roundRaw: string | null | undefined = null;
  let fechaReal: string | null = null;

  switch (tipo) {
    case "CFMS":
      roundRaw = line.cfm_round ?? null;
      fechaReal = line.cfm ?? null;
      break;
    case "COUNTERS":
      roundRaw = line.counter_round ?? null;
      fechaReal = line.counter_sample ?? null;
      break;
    case "FITTINGS":
      roundRaw = line.fitting_round ?? null;
      fechaReal = line.fitting ?? null;
      break;
    case "PPS":
      roundRaw = line.pps_round ?? null;
      fechaReal = line.pps ?? null;
      break;
    case "TESTINGS":
      roundRaw = line.testing_round ?? null;
      fechaReal = line.testing_sample ?? null;
      break;
    case "SHIPPINGS":
      roundRaw = line.shipping_round ?? null;
      fechaReal = line.shipping_sample ?? null;
      break;
    default:
      roundRaw = null;
      fechaReal = null;
  }

  // Si no se necesita la muestra (N/N o vacío) → no crear nada
  if (!isNeededRound(roundRaw)) return null;

  const round = extractRoundNumber(roundRaw);
  const fecha_teorica = calcFechaTeorica(
    tipo,
    header.po_date ?? null,
    line.finish_date ?? null
  );
  const estado_muestra = calcEstado(fechaReal, fecha_teorica);

  // NOTA: fecha_muestra = fecha REAL del Excel (si la hay)
  const fecha_muestra = fechaReal || null;

  return {
    tipo_muestra: tipo,          // ej. "CFMS", "PPS", "TESTINGS"
    round,                       // solo el número o "N/A"
    fecha_muestra,               // real
    fecha_teorica,               // teórica según reglas
    estado_muestra,              // "enviada" / "pendiente"
    notas: null,                 // de momento sin notas
  };
}

//
// ======================================================
//   🔵 IMPORTADOR PRINCIPAL
// ======================================================
//

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName, compareResult } = await req.json();

    console.log("🚀 Iniciando importación desde CSV:", fileName);
    let ok = 0;
    let errores = 0;

    for (const poGroup of groupedPOs as POGroup[]) {
      const { header, lines } = poGroup;
      const estadoPO = compareResult?.detalles?.[header.po]?.status || "nuevo";

      // ------------------------------------------------------
      // 1) Buscar / Crear PO (sin category/channel/size_run)
      // ------------------------------------------------------
      const { data: existing, error: findErr } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findErr) {
        console.error("❌ Buscar PO:", findErr);
        errores++;
        continue;
      }

      const skipFields = ["category", "channel", "size_run"];

      let poId: string;

      if (existing?.id) {
        const cleanHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) => v !== null && v !== "" && !skipFields.includes(k)
          )
        );

        const { error: updErr } = await supabase
          .from("pos")
          .update(cleanHeader)
          .eq("id", existing.id);

        if (updErr) {
          console.error("❌ Actualizar PO:", updErr);
          errores++;
          continue;
        }

        poId = existing.id;
      } else {
        const insertHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) => v !== null && v !== "" && !skipFields.includes(k)
          )
        );

        const { data: inserted, error: insErr } = await supabase
          .from("pos")
          .insert(insertHeader)
          .select("id")
          .maybeSingle();

        if (insErr || !inserted) {
          console.error("❌ Insertar PO:", insErr);
          errores++;
          continue;
        }

        poId = inserted.id;
      }

      // ------------------------------------------------------
      // 2) Si el PO es modificado → limpiar líneas y muestras
      // ------------------------------------------------------
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

      // ------------------------------------------------------
      // 3) Insertar nuevas líneas
      // ------------------------------------------------------
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
        .select("id, reference, style, color, size_run");

      if (lineErr || !insertedLines) {
        console.error("⚠️ Error insertando líneas:", lineErr);
        errores++;
        continue;
      }

      // ------------------------------------------------------
      // 4) Construir e insertar muestras (con fecha teórica)
      // ------------------------------------------------------
      const tiposMuestra = [
        "CFMS",
        "COUNTERS",
        "FITTINGS",
        "PPS",
        "TESTINGS",
        "SHIPPINGS",
      ] as const;

      const samplesToInsert: any[] = [];

      for (const insertedLine of insertedLines) {
        const line = lines.find(
          (l) =>
            l.reference === insertedLine.reference &&
            l.style === insertedLine.style &&
            l.color === insertedLine.color &&
            (l.size_run ?? "") === (insertedLine.size_run ?? "")
        );

        if (!line) continue;

        for (const tipo of tiposMuestra) {
          const sampleRecord = buildSampleRecord(tipo, line, header);
          if (!sampleRecord) continue;

          samplesToInsert.push({
            ...sampleRecord,
            linea_pedido_id: insertedLine.id,
          });
        }
      }

      if (samplesToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from("muestras")
          .insert(samplesToInsert);

        if (insErr) {
          console.error("⚠️ Error insertando muestras:", insErr);
          errores++;
        }
      }

      // ------------------------------------------------------
      // 5) Actualizar total de muestras del PO
      // ------------------------------------------------------
      const { count } = await supabase
        .from("muestras")
        .select("*", { count: "exact", head: true })
        .in(
          "linea_pedido_id",
          (
            await supabase
              .from("lineas_pedido")
              .select("id")
              .eq("po_id", poId)
          ).data?.map((l) => l.id) || []
        );

      await supabase
        .from("pos")
        .update({ total_muestras: count || 0 })
        .eq("id", poId);

      ok++;
    }

    // ------------------------------------------------------
    // 6) Registrar importación
    // ------------------------------------------------------
    await supabase.from("importaciones").insert({
      nombre_archivo: fileName,
      cantidad_registros: groupedPOs.length,
      estado: errores > 0 ? "parcial" : "completado",
      datos: { ok, errores },
    });

    console.log(`✅ Importación completada → ${ok} POs OK, ${errores} con errores`);

    return NextResponse.json({
      mensaje: "Importación finalizada",
      ok,
      errores,
    });
  } catch (error: any) {
    console.error("❌ Error general en importación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
