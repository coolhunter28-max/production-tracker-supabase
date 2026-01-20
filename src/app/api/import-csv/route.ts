// src/app/api/import-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ======================================================
//  TYPES
// ======================================================

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

  // ✅ NUEVO (BSG / SELLING)
  pi_bsg?: string | null;
  price_selling?: number | null;
  amount_selling?: number | null;

  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;

  // Fechas reales de muestras
  cfm?: string | null;
  counter_sample?: string | null;
  fitting?: string | null;
  pps?: string | null;
  testing_sample?: string | null;
  shipping_sample?: string | null;

  // Round originales
  cfm_round?: string | null;
  counter_round?: string | null;
  fitting_round?: string | null;
  pps_round?: string | null;
  testing_round?: string | null;
  shipping_round?: string | null;

  // Approvals + fechas
  cfm_approval?: string | null;
  cfm_approval_date?: string | null;
  counter_approval?: string | null;
  counter_approval_date?: string | null;
  fitting_approval?: string | null;
  fitting_approval_date?: string | null;
  pps_approval?: string | null;
  pps_approval_date?: string | null;
  testing_approval?: string | null;
  testing_approval_date?: string | null;
  shipping_approval?: string | null;
  shipping_approval_date?: string | null;
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

// ======================================================
//  HELPERS
// ======================================================

function extractRoundNumber(v: string | null | undefined): string {
  if (!v) return "N/A";
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "N/N") return "N/A";
  const match = s.match(/\d+/);
  return match ? match[0] : "N/A";
}

function isNeededRound(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = String(v).trim().toUpperCase();
  return !(s === "" || s === "N/N" || s === "NO" || s === "NONE");
}

function addDays(base: string, days: number): string | null {
  if (!base) return null;
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function subDays(base: string, days: number): string | null {
  return addDays(base, -days);
}

function calcFechaTeorica(
  tipo: string,
  po_date: string | null | undefined,
  finish_date: string | null | undefined
): string | null {
  switch (tipo) {
    case "CFMS":
      return po_date ? addDays(po_date, 25) : null;
    case "COUNTERS":
      return po_date ? addDays(po_date, 10) : null;
    case "FITTINGS":
      return po_date ? addDays(po_date, 25) : null;
    case "PPS":
      return po_date ? addDays(po_date, 45) : null;
    case "TESTINGS":
      return finish_date ? subDays(finish_date, 14) : null;
    case "SHIPPINGS":
      return finish_date ? subDays(finish_date, 7) : null;
    default:
      return null;
  }
}

/**
 * Estado de la muestra en función de la fecha real:
 * - Sin fecha → "Pendiente"
 * - Fecha válida <= hoy → "Enviado"
 * - Fecha válida > hoy (futuro) → "Pendiente"
 */
function calcEstado(fechaReal: string | null): "Enviado" | "Pendiente" {
  if (!fechaReal || !fechaReal.trim()) return "Pendiente";

  const d = new Date(fechaReal + "T00:00:00");
  if (isNaN(d.getTime())) return "Pendiente";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (d.getTime() <= hoy.getTime()) return "Enviado";
  return "Pendiente";
}

function interpretApproval(
  raw: string | null | undefined
): "confirmada" | "no_confirmada" | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (["cfm", "confirmed", "confirmada", "ok"].includes(s)) return "confirmada";
  if (["n/cfm", "n/c", "no confirmada", "not confirmed"].includes(s))
    return "no_confirmada";
  return null;
}

function buildApprovalNotes(
  status: "confirmada" | "no_confirmada" | null,
  date: string | null | undefined
): string | null {
  if (!status) return null;
  if (status === "confirmada")
    return date ? `Confirmada ${date}` : "Confirmada sin fecha";
  return date ? `No confirmada ${date}` : "No confirmada sin fecha";
}

// ======================================================
//  BUILD SAMPLE RECORD
// ======================================================

function buildSampleRecord(tipo: string, line: LineData, header: POHeader) {
  let roundRaw: string | null | undefined = null;
  let fechaReal: string | null = null;
  let approvalText: string | null | undefined = null;
  let approvalDate: string | null | undefined = null;

  switch (tipo) {
    case "CFMS":
      roundRaw = line.cfm_round;
      fechaReal = line.cfm ?? null;
      approvalText = line.cfm_approval;
      approvalDate = line.cfm_approval_date;
      break;

    case "COUNTERS":
      roundRaw = line.counter_round;
      fechaReal = line.counter_sample ?? null;
      approvalText = line.counter_approval;
      approvalDate = line.counter_approval_date;
      break;

    case "FITTINGS":
      roundRaw = line.fitting_round;
      fechaReal = line.fitting ?? null;
      approvalText = line.fitting_approval;
      approvalDate = line.fitting_approval_date;
      break;

    case "PPS":
      roundRaw = line.pps_round;
      fechaReal = line.pps ?? null;
      approvalText = line.pps_approval;
      approvalDate = line.pps_approval_date;
      break;

    case "TESTINGS":
      roundRaw = line.testing_round;
      fechaReal = line.testing_sample ?? null;
      approvalText = line.testing_approval;
      approvalDate = line.testing_approval_date;
      break;

    case "SHIPPINGS":
      roundRaw = line.shipping_round;
      fechaReal = line.shipping_sample ?? null;
      approvalText = line.shipping_approval;
      approvalDate = line.shipping_approval_date;
      break;

    default:
      return null;
  }

  if (!isNeededRound(roundRaw)) return null;

  const round = extractRoundNumber(roundRaw);
  const fecha_teorica = calcFechaTeorica(tipo, header.po_date, line.finish_date);
  const fecha_muestra = fechaReal || null;

  const interpreted = interpretApproval(approvalText);

  let estado_muestra: string;
  if (interpreted === "confirmada") estado_muestra = "Aprobado";
  else if (interpreted === "no_confirmada") estado_muestra = "Rechazado";
  else estado_muestra = calcEstado(fecha_muestra);

  const notas = buildApprovalNotes(interpreted, approvalDate);

  return {
    tipo_muestra: tipo,
    round,
    fecha_muestra,
    fecha_teorica,
    estado_muestra,
    notas,
  };
}

// ======================================================
//  IMPORTADOR PRINCIPAL (Opción B: siempre limpia/regen)
// ======================================================

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    console.log("🚀 Iniciando importación desde CSV:", fileName);
    let ok = 0;
    let errores = 0;

    for (const poGroup of groupedPOs as POGroup[]) {
      const { header, lines } = poGroup;

      // 1) Buscar si ya existe el PO
      const { data: existing, error: findErr } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findErr) {
        console.error("❌ Error buscando PO:", findErr);
        errores++;
        continue;
      }

      const skipFields = ["category", "channel", "size_run"];
      let poId: string;

      if (existing?.id) {
        // 2A) Actualizar cabecera
        const cleanHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) => v !== null && v !== "" && !skipFields.includes(k)
          )
        );

        await supabase.from("pos").update(cleanHeader).eq("id", existing.id);
        poId = existing.id;

        // 2B) Borrar líneas + muestras antiguas
        const { data: oldLines } = await supabase
          .from("lineas_pedido")
          .select("id")
          .eq("po_id", poId);

        if (oldLines?.length) {
          const ids = oldLines.map((l) => l.id);
          await supabase.from("muestras").delete().in("linea_pedido_id", ids);
          await supabase.from("lineas_pedido").delete().in("id", ids);
        }
      } else {
        // 2C) Crear PO nuevo
        const insertHeader = Object.fromEntries(
          Object.entries(header).filter(
            ([k, v]) => v !== null && v !== "" && !skipFields.includes(k)
          )
        );

        const { data: inserted } = await supabase
          .from("pos")
          .insert(insertHeader)
          .select("id")
          .maybeSingle();

        if (!inserted) {
          errores++;
          continue;
        }

        poId = inserted.id;
      }

      // 3) Insertar líneas nuevas ✅ (con pi_bsg, price_selling, amount_selling)
      const { data: insertedLines, error: lineErr } = await supabase
        .from("lineas_pedido")
        .insert(
          lines.map((l) => {
            // Importante: mantener null si viene vacío.
            const priceSelling =
              l.price_selling === undefined ? null : l.price_selling;

            // Si no viene amount_selling pero sí price_selling, lo calculamos.
            const computedAmountSelling =
              l.amount_selling === undefined || l.amount_selling === null
                ? priceSelling !== null
                  ? Number(priceSelling) * Number(l.qty ?? 0)
                  : null
                : l.amount_selling;

            return {
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

              // ✅ NUEVO
              pi_bsg: l.pi_bsg ?? null,
              price_selling: priceSelling,
              amount_selling: computedAmountSelling,

              trial_upper: l.trial_upper,
              trial_lasting: l.trial_lasting,
              lasting: l.lasting,
              finish_date: l.finish_date,
            };
          })
        )
        .select("id, reference, style, color, size_run");

      if (lineErr || !insertedLines) {
        console.error("⚠️ Error insertando líneas:", lineErr);
        errores++;
        continue;
      }

      // 4) Insertar muestras nuevas
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
        const lineOriginal = lines.find(
          (l) =>
            l.reference === insertedLine.reference &&
            l.style === insertedLine.style &&
            l.color === insertedLine.color &&
            (l.size_run ?? "") === (insertedLine.size_run ?? "")
        );
        if (!lineOriginal) continue;

        for (const tipo of tiposMuestra) {
          const s = buildSampleRecord(tipo, lineOriginal, header);
          if (s) {
            samplesToInsert.push({
              ...s,
              linea_pedido_id: insertedLine.id,
            });
          }
        }
      }

      if (samplesToInsert.length > 0) {
        const { error: insSamplesErr } = await supabase
          .from("muestras")
          .insert(samplesToInsert);

        if (insSamplesErr) {
          console.error("⚠️ Error insertando muestras:", insSamplesErr);
          errores++;
        }
      }

      ok++;
    }

    // 5) Registro de importación
    await supabase.from("importaciones").insert({
      nombre_archivo: fileName,
      cantidad_registros: groupedPOs.length,
      estado: errores > 0 ? "parcial" : "completado",
      datos: { ok, errores },
    });

    console.log(
      `✅ Importación finalizada → ${ok} POs procesados, ${errores} con errores`
    );

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
