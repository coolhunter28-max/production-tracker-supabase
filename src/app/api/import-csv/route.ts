// src/app/api/import-csv/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getCurrentUserAccess } from "@/lib/ownership";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LineData = {
  reference: string;
  style: string;
  color: string;
  size_run?: string | null;
  category?: string | null;
  channel?: string | null;
  qty: number | string;
  price: number | string;
  amount?: number | string | null;
  pi_bsg?: string | null;
  price_selling?: number | string | null;
  amount_selling?: number | string | null;
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;
  cfm?: string | null;
  counter_sample?: string | null;
  fitting?: string | null;
  pps?: string | null;
  testing_sample?: string | null;
  shipping_sample?: string | null;
  cfm_round?: string | null;
  counter_round?: string | null;
  fitting_round?: string | null;
  pps_round?: string | null;
  testing_round?: string | null;
  shipping_round?: string | null;
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

type ExistingLine = {
  id: string;
  reference: string | null;
  style: string | null;
  color: string | null;
  size_run: string | null;
  channel: string | null;
  category: string | null;
  qty: number | string | null;
  price: number | string | null;
  amount: number | string | null;
  estado: string | null;
};

function normalizeKey(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function parseQty(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim().replace(/\s/g, "");
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "").replace(/,/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseMoney(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
  }

  let raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/€/g, "");

  if (!raw) return null;

  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : null;
}

function sameMoney(a: any, b: any): boolean {
  const left = parseMoney(a);
  const right = parseMoney(b);

  if (left === null && right === null) return true;
  if (left === null || right === null) return false;

  return Math.abs(left - right) <= 0.0001;
}

function sameQty(a: any, b: any): boolean {
  const left = parseQty(a);
  const right = parseQty(b);

  if (left === null && right === null) return true;
  if (left === null || right === null) return false;

  return left === right;
}

/**
 * Clave operativa real de línea.
 * El Excel permite varias líneas con mismo reference/style/color/size_run.
 * La línea se diferencia por channel, category y qty.
 */
function lineKey(line: {
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  size_run?: string | null;
  channel?: string | null;
  category?: string | null;
  qty?: number | string | null;
}) {
  return [
    normalizeKey(line.reference),
    normalizeKey(line.style),
    normalizeKey(line.color),
    normalizeKey(line.size_run),
    normalizeKey(line.channel),
    normalizeKey(line.category),
    String(parseQty(line.qty) ?? ""),
  ].join("||");
}

function lineLabel(line: {
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  size_run?: string | null;
  channel?: string | null;
  category?: string | null;
  qty?: number | string | null;
}) {
  return [
    normalizeKey(line.reference) || "-",
    normalizeKey(line.style) || "-",
    normalizeKey(line.color) || "-",
    normalizeKey(line.size_run) || "-",
    normalizeKey(line.channel) || "-",
    normalizeKey(line.category) || "-",
    String(parseQty(line.qty) ?? "-"),
  ].join(" / ");
}

function cleanObject<T extends Record<string, any>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
}

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

function calcEstado(fechaReal: string | null): "Enviado" | "Pendiente" {
  if (!fechaReal || !fechaReal.trim()) return "Pendiente";

  const d = new Date(fechaReal + "T00:00:00");
  if (isNaN(d.getTime())) return "Pendiente";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return d.getTime() <= hoy.getTime() ? "Enviado" : "Pendiente";
}

function interpretApproval(
  raw: string | null | undefined
): "confirmada" | "no_confirmada" | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (["cfm", "confirmed", "confirmada", "ok"].includes(s)) return "confirmada";
  if (["n/cfm", "n/c", "no confirmada", "not confirmed"].includes(s)) {
    return "no_confirmada";
  }
  return null;
}

function buildApprovalNotes(
  status: "confirmada" | "no_confirmada" | null,
  date: string | null | undefined
): string | null {
  if (!status) return null;
  if (status === "confirmada") {
    return date ? `Confirmada ${date}` : "Confirmada sin fecha";
  }
  return date ? `No confirmada ${date}` : "No confirmada sin fecha";
}

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

  if (!isNeededRound(roundRaw)) {
    return {
      tipo_muestra: tipo,
      round: "N/N",
      fecha_muestra: null,
      fecha_teorica: null,
      estado_muestra: "N/N",
      notas: "No Need",
    };
  }

  const round = extractRoundNumber(roundRaw);
  const fecha_teorica = calcFechaTeorica(tipo, header.po_date, line.finish_date);
  const fecha_muestra = fechaReal || null;
  const interpreted = interpretApproval(approvalText);

  let estado_muestra: string;
  if (interpreted === "confirmada") estado_muestra = "Aprobado";
  else if (interpreted === "no_confirmada") estado_muestra = "Rechazado";
  else estado_muestra = calcEstado(fecha_muestra);

  return {
    tipo_muestra: tipo,
    round,
    fecha_muestra,
    fecha_teorica,
    estado_muestra,
    notas: buildApprovalNotes(interpreted, approvalDate),
  };
}

function buildLinePayload(line: LineData, poId: string) {
  const qty = parseQty(line.qty) ?? 0;
  const price = parseMoney(line.price) ?? 0;
  const amount = parseMoney(line.amount) ?? Number((qty * price).toFixed(2));

  const priceSelling =
    line.price_selling === undefined || line.price_selling === null
      ? null
      : parseMoney(line.price_selling);

  const amountSelling =
    line.amount_selling === undefined || line.amount_selling === null
      ? priceSelling !== null
        ? Number((priceSelling * qty).toFixed(2))
        : null
      : parseMoney(line.amount_selling);

  return cleanObject({
    po_id: poId,
    reference: line.reference ?? null,
    style: line.style,
    color: line.color,
    size_run: line.size_run ?? null,
    category: line.category ?? null,
    channel: line.channel ?? null,
    qty,
    price,
    amount,
    pi_bsg: line.pi_bsg ?? null,
    price_selling: priceSelling,
    amount_selling: amountSelling,
    trial_upper: line.trial_upper ?? null,
    trial_lasting: line.trial_lasting ?? null,
    lasting: line.lasting ?? null,
    finish_date: line.finish_date ?? null,
    estado: "ACTIVA",
    cancelled_at: null,
    cancelled_reason: null,
  });
}

function buildHeaderPayload(header: POHeader) {
  const skipFields = new Set(["category", "channel", "size_run"]);

  return Object.fromEntries(
    Object.entries(header)
      .filter(([key]) => !skipFields.has(key))
      .filter(([, value]) => value !== undefined)
      .concat([
        ["estado", "ACTIVO"],
        ["cancelled_at", null],
        ["cancelled_reason", null],
      ])
  );
}

async function upsertSamples(
  lineId: string,
  lineOriginal: LineData,
  header: POHeader
) {
  const tiposMuestra = [
    "CFMS",
    "COUNTERS",
    "FITTINGS",
    "PPS",
    "TESTINGS",
    "SHIPPINGS",
  ] as const;

  const { data: existingSamples, error } = await supabase
    .from("muestras")
    .select("id, tipo_muestra")
    .eq("linea_pedido_id", lineId);

  if (error) {
    throw new Error(`Error leyendo muestras de línea ${lineId}: ${error.message}`);
  }

  const existingByType = new Map(
    (existingSamples ?? []).map((sample: any) => [sample.tipo_muestra, sample])
  );

  for (const tipo of tiposMuestra) {
    const samplePayload = buildSampleRecord(tipo, lineOriginal, header);
    if (!samplePayload) continue;

    const existing = existingByType.get(tipo);

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("muestras")
        .update(samplePayload)
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(
          `Error actualizando muestra ${tipo} (${existing.id}): ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } = await supabase.from("muestras").insert({
        ...samplePayload,
        linea_pedido_id: lineId,
      });

      if (insertError) {
        throw new Error(
          `Error insertando muestra ${tipo} en línea ${lineId}: ${insertError.message}`
        );
      }
    }
  }
}

function chooseExistingLine(
  matches: ExistingLine[],
  incomingLine: LineData
): ExistingLine | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  const exactMatches = matches.filter(
    (match) =>
      normalizeKey(match.channel) === normalizeKey(incomingLine.channel) &&
      normalizeKey(match.category) === normalizeKey(incomingLine.category) &&
      sameQty(match.qty, incomingLine.qty) &&
      sameMoney(match.price, incomingLine.price)
  );

  if (exactMatches.length === 1) return exactMatches[0];

  return null;
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess();

    const canImportSpain =
      access.isActive &&
      (access.role === "ADMIN" || access.role === "MANAGER");

    if (!canImportSpain) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { groupedPOs, fileName } = await req.json();

    if (!Array.isArray(groupedPOs)) {
      return NextResponse.json(
        { error: "groupedPOs must be an array" },
        { status: 400 }
      );
    }

    let ok = 0;
    let errores = 0;
    let posCreados = 0;
    let posActualizados = 0;
    let lineasCreadas = 0;
    let lineasActualizadas = 0;
    let lineasCanceladas = 0;
    let posCancelados = 0;

    const avisos: string[] = [];
    const cambios: string[] = [];
    const incomingPONumbers = new Set<string>();
    const importedSeasons = new Set<string>();

    for (const poGroup of groupedPOs as POGroup[]) {
      if (poGroup.header?.po) incomingPONumbers.add(normalizeKey(poGroup.header.po));
      if (poGroup.header?.season) importedSeasons.add(String(poGroup.header.season).trim());
    }

    for (const poGroup of groupedPOs as POGroup[]) {
      const { header, lines } = poGroup;

      if (!header?.po) {
        errores++;
        avisos.push("PO sin número. Se omite.");
        continue;
      }

      const { data: existing, error: findErr } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findErr) {
        errores++;
        avisos.push(`[PO ${header.po}] Error buscando PO: ${findErr.message}`);
        continue;
      }

      let poId: string;

      if (existing?.id) {
        const { error: updateHeaderError } = await supabase
          .from("pos")
          .update(buildHeaderPayload(header))
          .eq("id", existing.id);

        if (updateHeaderError) {
          errores++;
          avisos.push(
            `[PO ${header.po}] Error actualizando cabecera: ${updateHeaderError.message}`
          );
          continue;
        }

        poId = existing.id;
        posActualizados++;
      } else {
        const { data: inserted, error: insertHeaderError } = await supabase
          .from("pos")
          .insert(buildHeaderPayload(header))
          .select("id")
          .maybeSingle();

        if (insertHeaderError || !inserted) {
          errores++;
          avisos.push(
            `[PO ${header.po}] Error creando PO: ${
              insertHeaderError?.message ?? "No se pudo crear"
            }`
          );
          continue;
        }

        poId = inserted.id;
        posCreados++;
      }

      const { data: existingLines, error: existingLinesError } = await supabase
        .from("lineas_pedido")
        .select(
          "id, reference, style, color, size_run, channel, category, qty, price, amount, estado"
        )
        .eq("po_id", poId)
        .eq("estado", "ACTIVA");

      if (existingLinesError) {
        errores++;
        avisos.push(
          `[PO ${header.po}] Error leyendo líneas existentes: ${existingLinesError.message}`
        );
        continue;
      }

      const existingLinesByKey = new Map<string, ExistingLine[]>();

      for (const existingLine of (existingLines ?? []) as ExistingLine[]) {
        const key = lineKey(existingLine);
        const current = existingLinesByKey.get(key) ?? [];
        current.push(existingLine);
        existingLinesByKey.set(key, current);
      }

      const matchedExistingLineIds = new Set<string>();

      for (const line of lines ?? []) {
        const key = lineKey(line);
        const matches = (existingLinesByKey.get(key) ?? []).filter(
          (match) => !matchedExistingLineIds.has(match.id)
        );
        const payload = buildLinePayload(line, poId);
        const existingLine = chooseExistingLine(matches, line);

        if (matches.length > 0 && !existingLine) {
          errores++;
          avisos.push(
            `[PO ${header.po}] Línea ambigua ${lineLabel(line)}. Existen ${matches.length} coincidencias. No se actualiza.`
          );
          continue;
        }

        if (existingLine) {
          const { error: updateLineError } = await supabase
            .from("lineas_pedido")
            .update(payload)
            .eq("id", existingLine.id);

          if (updateLineError) {
            errores++;
            avisos.push(
              `[PO ${header.po}] Error actualizando línea ${lineLabel(line)}: ${updateLineError.message}`
            );
            continue;
          }

          matchedExistingLineIds.add(existingLine.id);
          await upsertSamples(existingLine.id, line, header);

          lineasActualizadas++;
          cambios.push(`[PO ${header.po}] Línea actualizada ${lineLabel(line)}`);
        } else {
          const { data: insertedLine, error: insertLineError } = await supabase
            .from("lineas_pedido")
            .insert(payload)
            .select("id")
            .maybeSingle();

          if (insertLineError || !insertedLine) {
            errores++;
            avisos.push(
              `[PO ${header.po}] Error creando línea ${lineLabel(line)}: ${
                insertLineError?.message ?? "No se pudo crear"
              }`
            );
            continue;
          }

          matchedExistingLineIds.add(insertedLine.id);
          await upsertSamples(insertedLine.id, line, header);

          lineasCreadas++;
          cambios.push(`[PO ${header.po}] Línea creada ${lineLabel(line)}`);
        }
      }

      for (const existingLine of (existingLines ?? []) as ExistingLine[]) {
        if (matchedExistingLineIds.has(existingLine.id)) continue;

        const { error: cancelLineError } = await supabase
          .from("lineas_pedido")
          .update({
            estado: "CANCELADA",
            cancelled_at: new Date().toISOString(),
            cancelled_reason: `No aparece en importación Spain confirmada (${fileName ?? "archivo sin nombre"})`,
          })
          .eq("id", existingLine.id)
          .neq("estado", "CANCELADA");

        if (cancelLineError) {
          errores++;
          avisos.push(
            `[PO ${header.po}] Error cancelando línea ${lineLabel(existingLine)}: ${cancelLineError.message}`
          );
        } else {
          lineasCanceladas++;
          cambios.push(`[PO ${header.po}] Línea cancelada ${lineLabel(existingLine)}`);
        }
      }

      ok++;
    }

    if (importedSeasons.size > 0) {
      const { data: existingPOsInScope, error: existingPOsError } = await supabase
        .from("pos")
        .select("id, po")
        .in("season", [...importedSeasons]);

      if (existingPOsError) {
        errores++;
        avisos.push(
          `No se pudieron revisar POs cancelados por temporada: ${existingPOsError.message}`
        );
      } else {
        for (const existingPO of existingPOsInScope ?? []) {
          if (incomingPONumbers.has(normalizeKey(existingPO.po))) continue;

          const cancelReason = `PO no aparece en importación Spain confirmada (${fileName ?? "archivo sin nombre"})`;

          const { error: cancelPOError } = await supabase
            .from("pos")
            .update({
              estado: "CANCELADO",
              cancelled_at: new Date().toISOString(),
              cancelled_reason: cancelReason,
            })
            .eq("id", existingPO.id)
            .neq("estado", "CANCELADO");

          if (cancelPOError) {
            errores++;
            avisos.push(
              `[PO ${existingPO.po}] Error cancelando PO: ${cancelPOError.message}`
            );
            continue;
          }

          await supabase
            .from("lineas_pedido")
            .update({
              estado: "CANCELADA",
              cancelled_at: new Date().toISOString(),
              cancelled_reason: cancelReason,
            })
            .eq("po_id", existingPO.id)
            .neq("estado", "CANCELADA");

          posCancelados++;
          cambios.push(`[PO ${existingPO.po}] PO cancelado`);
        }
      }
    }

    await supabase.from("importaciones").insert({
      nombre_archivo: fileName,
      cantidad_registros: groupedPOs.length,
      estado: errores > 0 ? "parcial" : "completado",
      datos: {
        ok,
        errores,
        pos_creados: posCreados,
        pos_actualizados: posActualizados,
        pos_cancelados: posCancelados,
        lineas_creadas: lineasCreadas,
        lineas_actualizadas: lineasActualizadas,
        lineas_canceladas: lineasCanceladas,
        avisos,
        cambios,
      },
    });

    return NextResponse.json({
      mensaje: "Importación finalizada",
      ok,
      errores,
      pos_creados: posCreados,
      pos_actualizados: posActualizados,
      pos_cancelados: posCancelados,
      lineas_creadas: lineasCreadas,
      lineas_actualizadas: lineasActualizadas,
      lineas_canceladas: lineasCanceladas,
      avisos,
      detalles: { cambios },
    });
  } catch (error: any) {
    console.error("❌ Error general en importación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
