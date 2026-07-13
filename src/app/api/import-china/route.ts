// src/app/api/import-china/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUserAccess } from "@/lib/ownership";
import ExcelJS from "exceljs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function parseDate(value: any) {
  if (!value) return null;

  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString().split("T")[0];
    }

    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function parseCell(value: any): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    if ("text" in value && (value as any).text) {
      return String((value as any).text).trim();
    }

    if ("richText" in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((r: any) => r.text).join("").trim();
    }

    if ("result" in value) {
      return parseCell((value as any).result);
    }
  }

  const text = String(value).trim();
  return text ? text : null;
}

function norm(value: any) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isEmptyExportValue(value: any) {
  const v = norm(value);
  return !v || v === "-" || v === "—";
}

function sameExportValue(excelValue: any, dbValue: any) {
  if (isEmptyExportValue(excelValue) && isEmptyExportValue(dbValue)) return true;
  return norm(excelValue) === norm(dbValue);
}

function sameDateValue(excelDate: string | null, dbDate: any) {
  if (!excelDate && !dbDate) return true;
  return String(excelDate ?? "") === String(dbDate ?? "");
}

function pushChange(cambios: string[], msg: string) {
  cambios.push(msg);
}

function normalizeHeader(value: any) {
  return norm(parseCell(value))
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findHeaderRow(sheet: ExcelJS.Worksheet) {
  for (let rowIndex = 1; rowIndex <= Math.min(sheet.rowCount, 10); rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const headers = new Set<string>();

    row.eachCell((cell) => {
      const header = normalizeHeader(cell.value);
      if (header) headers.add(header);
    });

    if (headers.has("sco") && headers.has("po") && headers.has("reference")) {
      return rowIndex;
    }
  }

  return null;
}

function buildHeaderMap(sheet: ExcelJS.Worksheet, headerRowNumber: number) {
  const row = sheet.getRow(headerRowNumber);
  const map = new Map<string, number>();

  row.eachCell((cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (key) map.set(key, colNumber);
  });

  return map;
}

function getColumn(map: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const col = map.get(key);
    if (col) return col;
  }

  return null;
}

function getText(row: ExcelJS.Row, col: number | null) {
  if (!col) return null;
  return parseCell(row.getCell(col).value);
}

function getDate(row: ExcelJS.Row, col: number | null) {
  if (!col) return null;
  return parseDate(row.getCell(col).value);
}

type ParsedChinaRow = {
  rowIndex: number;
  lineaId: string;

  excelSupplier: string;
  excelSeason: string;
  excelCustomer: string;
  excelPO: string;
  excelFactory: string;
  excelRef: string;
  excelStyle: string;
  excelColor: string;
  excelSize: string;
  excelCategory: string;
  excelChannel: string;

  newTrialUpper: string | null;
  newTrialLasting: string | null;
  newLasting: string | null;
  newFinishDate: string | null;

  muestras: Record<string, string | null>;

  inspection: string | null;
  booking: string | null;
  closing: string | null;
  shipping_date: string | null;

  linea?: any;
  poData?: any;
};

// -------------------------------------------------------------
// API POST
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const access = await getCurrentUserAccess();

    const canImportChina =
      access.isActive &&
      (access.role === "ADMIN" || access.role === "MANAGER");

    if (!canImportChina) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet("China");
    if (!sheet) {
      return NextResponse.json(
        { error: "Worksheet 'China' not found" },
        { status: 400 }
      );
    }

    const headerRowNumber = findHeaderRow(sheet);
    if (!headerRowNumber) {
      return NextResponse.json(
        {
          status: "blocked",
          pos_encontrados: 0,
          lineas_actualizadas: 0,
          muestras_actualizadas: 0,
          avisos: [],
          errores: [
            "IMPORTACIÓN BLOQUEADA: no se ha actualizado ningún dato.",
            "No se ha encontrado una cabecera válida en la hoja China.",
            "El archivo debe incluir al menos las columnas SCO, PO y REFERENCE.",
          ],
          detalles: { cambios: [] },
        },
        { status: 200 }
      );
    }

    const headerMap = buildHeaderMap(sheet, headerRowNumber);

    const COL = {
      sco: getColumn(headerMap, ["SCO"]),
      supplier: getColumn(headerMap, ["SUPPLIER"]),
      season: getColumn(headerMap, ["SEASON"]),
      customer: getColumn(headerMap, ["CUSTOMER"]),
      factory: getColumn(headerMap, ["FACTORY"]),
      po: getColumn(headerMap, ["PO"]),
      reference: getColumn(headerMap, ["REFERENCE"]),
      style: getColumn(headerMap, ["STYLE"]),
      color: getColumn(headerMap, ["COLOR"]),
      size: getColumn(headerMap, ["SIZE RUN", "SIZE"]),
      category: getColumn(headerMap, ["CATEGORY"]),
      channel: getColumn(headerMap, ["CHANNEL"]),

      cfms: getColumn(headerMap, ["CFMs", "CFMS"]),
      counters: getColumn(headerMap, ["Counter Sample", "COUNTERS"]),
      fittings: getColumn(headerMap, ["Fitting", "FITTINGS"]),
      pps: getColumn(headerMap, ["PPS"]),
      testings: getColumn(headerMap, ["Testing Samples", "TESTINGS"]),
      shippings: getColumn(headerMap, ["Shipping Samples", "SHIPPINGS"]),

      trialUpper: getColumn(headerMap, ["Trial Upper"]),
      trialLasting: getColumn(headerMap, ["Trial Lasting"]),
      lasting: getColumn(headerMap, ["Lasting"]),
      finishDate: getColumn(headerMap, ["Finish Date"]),

      inspection: getColumn(headerMap, ["Inspection"]),
      booking: getColumn(headerMap, ["Booking"]),
      closing: getColumn(headerMap, ["Closing"]),
      shippingDate: getColumn(headerMap, ["Shipping", "Shipping Date"]),
    };

    if (!COL.sco || !COL.po || !COL.reference || !COL.style || !COL.color) {
      return NextResponse.json(
        {
          status: "blocked",
          pos_encontrados: 0,
          lineas_actualizadas: 0,
          muestras_actualizadas: 0,
          avisos: [],
          errores: [
            "IMPORTACIÓN BLOQUEADA: no se ha actualizado ningún dato.",
            "Faltan columnas obligatorias en el Excel.",
            "Obligatorias: SCO, PO, REFERENCE, STYLE y COLOR.",
          ],
          detalles: { cambios: [] },
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------
    // CONTADORES E INFORME
    // -------------------------------------------------------------
    const avisos: string[] = [];
    const errores: string[] = [];
    const cambios: string[] = [];

    const posEncontrados = new Set<string>();
    let lineasActualizadas = 0;
    let muestrasActualizadas = 0;

    const dataStart = headerRowNumber + 1;
    const parsedRows: ParsedChinaRow[] = [];
    const seenLineIds = new Map<string, number>();

    // -------------------------------------------------------------
    // PASO 1: PARSEAR EXCEL SIN ESCRIBIR NADA
    // -------------------------------------------------------------
    for (let rowIndex = dataStart; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      const lineaId = getText(row, COL.sco);
      if (!lineaId) continue;

      if (seenLineIds.has(lineaId)) {
        errores.push(
          `[Fila ${rowIndex}] SCO duplicado en Excel: ${lineaId}. Ya apareció en fila ${seenLineIds.get(lineaId)}.`
        );
        continue;
      }

      seenLineIds.set(lineaId, rowIndex);

      parsedRows.push({
        rowIndex,
        lineaId,

        excelSupplier: getText(row, COL.supplier) ?? "-",
        excelSeason: getText(row, COL.season) ?? "-",
        excelCustomer: getText(row, COL.customer) ?? "-",
        excelPO: getText(row, COL.po) ?? "-",
        excelFactory: getText(row, COL.factory) ?? "-",
        excelRef: getText(row, COL.reference) ?? "-",
        excelStyle: getText(row, COL.style) ?? "-",
        excelColor: getText(row, COL.color) ?? "-",
        excelSize: getText(row, COL.size) ?? "-",
        excelCategory: getText(row, COL.category) ?? "-",
        excelChannel: getText(row, COL.channel) ?? "-",

        newTrialUpper: getDate(row, COL.trialUpper),
        newTrialLasting: getDate(row, COL.trialLasting),
        newLasting: getDate(row, COL.lasting),
        newFinishDate: getDate(row, COL.finishDate),

        muestras: {
          CFMS: getDate(row, COL.cfms),
          COUNTERS: getDate(row, COL.counters),
          FITTINGS: getDate(row, COL.fittings),
          PPS: getDate(row, COL.pps),
          TESTINGS: getDate(row, COL.testings),
          SHIPPINGS: getDate(row, COL.shippings),
        },

        inspection: getDate(row, COL.inspection),
        booking: getDate(row, COL.booking),
        closing: getDate(row, COL.closing),
        shipping_date: getDate(row, COL.shippingDate),
      });
    }

    // -------------------------------------------------------------
    // PASO 2: VALIDAR IDENTIDAD DE CADA FILA CONTRA BD
    //
    // CRÍTICO:
    // - El UUID de columna SCO sigue siendo la única clave real de escritura.
    // - Las columnas visibles se validan para evitar SCO desalineados.
    // - La lectura se hace por nombre de columna, no por posición, para que
    //   SCO Legacy u otras columnas auxiliares no desplacen el importador.
    // -------------------------------------------------------------
    for (const parsed of parsedRows) {
      const { data: linea, error: lineaError } = await supabase
        .from("lineas_pedido")
        .select(
          `
            id,
            po_id,
            reference,
            style,
            color,
            size_run,
            category,
            channel,
            factory,
            inspection,
            booking,
            closing,
            shipping_date,
            trial_upper,
            trial_lasting,
            lasting,
            finish_date,
            muestras ( id, tipo_muestra, fecha_muestra )
          `
        )
        .eq("id", parsed.lineaId)
        .single();

      if (lineaError || !linea) {
        errores.push(
          `[Fila ${parsed.rowIndex}] [PO Excel ${parsed.excelPO}] [Ref ${parsed.excelRef}] [Style ${parsed.excelStyle}] [Color ${parsed.excelColor}] [SCO ${parsed.lineaId}] Línea no existe en BD.`
        );
        continue;
      }

      const { data: poRow, error: poErr } = await supabase
        .from("pos")
        .select("id, po, season, supplier, customer")
        .eq("id", linea.po_id)
        .single();

      if (poErr || !poRow) {
        errores.push(
          `[Fila ${parsed.rowIndex}] [SCO ${parsed.lineaId}] No se pudo leer cabecera del PO en BD.`
        );
        continue;
      }

      parsed.linea = linea;
      parsed.poData = poRow;

      const mismatch: string[] = [];

      if (!sameExportValue(parsed.excelPO, poRow.po)) {
        mismatch.push(`PO Excel "${parsed.excelPO}" ≠ BD "${poRow.po}"`);
      }

      if (!sameExportValue(parsed.excelSeason, poRow.season)) {
        mismatch.push(`Season Excel "${parsed.excelSeason}" ≠ BD "${poRow.season}"`);
      }

      if (!sameExportValue(parsed.excelSupplier, poRow.supplier)) {
        mismatch.push(`Supplier Excel "${parsed.excelSupplier}" ≠ BD "${poRow.supplier ?? "-"}"`);
      }

      if (!sameExportValue(parsed.excelCustomer, poRow.customer)) {
        mismatch.push(`Customer Excel "${parsed.excelCustomer}" ≠ BD "${poRow.customer ?? "-"}"`);
      }

      if (!sameExportValue(parsed.excelRef, linea.reference)) {
        mismatch.push(`Ref Excel "${parsed.excelRef}" ≠ BD "${linea.reference ?? "-"}"`);
      }

      if (!sameExportValue(parsed.excelStyle, linea.style)) {
        mismatch.push(`Style Excel "${parsed.excelStyle}" ≠ BD "${linea.style ?? "-"}"`);
      }

      if (!sameExportValue(parsed.excelColor, linea.color)) {
        mismatch.push(`Color Excel "${parsed.excelColor}" ≠ BD "${linea.color ?? "-"}"`);
      }

      if (COL.size && !sameExportValue(parsed.excelSize, linea.size_run)) {
        mismatch.push(`Size Excel "${parsed.excelSize}" ≠ BD "${linea.size_run ?? "-"}"`);
      }

      if (COL.category && !sameExportValue(parsed.excelCategory, linea.category)) {
        mismatch.push(`Category Excel "${parsed.excelCategory}" ≠ BD "${linea.category ?? "-"}"`);
      }

      if (COL.channel && !sameExportValue(parsed.excelChannel, linea.channel)) {
        mismatch.push(`Channel Excel "${parsed.excelChannel}" ≠ BD "${linea.channel ?? "-"}"`);
      }

      if (mismatch.length > 0) {
        errores.push(
          `[Fila ${parsed.rowIndex}] [SCO ${parsed.lineaId}] Identidad de línea no coincide. ${mismatch.join(" | ")}`
        );
      }

      posEncontrados.add(linea.po_id);
    }

    // -------------------------------------------------------------
    // BLOQUEO TOTAL SI HAY ERRORES DE VALIDACIÓN
    // -------------------------------------------------------------
    if (errores.length > 0) {
      return NextResponse.json({
        status: "blocked",
        pos_encontrados: posEncontrados.size,
        lineas_actualizadas: 0,
        muestras_actualizadas: 0,
        avisos,
        errores: [
          "IMPORTACIÓN BLOQUEADA: no se ha actualizado ningún dato.",
          "El Excel no coincide de forma segura con las líneas de la base de datos.",
          "Revisa los errores de identidad antes de volver a importar.",
          ...errores,
        ],
        detalles: { cambios: [] },
      });
    }

    // -------------------------------------------------------------
    // PASO 3: APLICAR CAMBIOS DE LÍNEA Y MUESTRAS
    // -------------------------------------------------------------
    for (const parsed of parsedRows) {
      const linea = parsed.linea;
      const poData = parsed.poData;

      if (!linea || !poData) continue;

      const refBD = linea.reference || parsed.excelRef;
      const styleBD = linea.style || parsed.excelStyle;
      const colorBD = linea.color || parsed.excelColor;
      const poNumber = poData.po || parsed.excelPO;

      const updateLinea: any = {};

      // -------------------------------------------------------------
      // DATOS OPERATIVOS DE LÍNEA
      // -------------------------------------------------------------
      if (
        !isEmptyExportValue(parsed.excelFactory) &&
        !sameExportValue(parsed.excelFactory, linea.factory)
      ) {
        updateLinea.factory = parsed.excelFactory;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] factory: ${linea.factory || "—"} → ${parsed.excelFactory}`
        );
      }

      if (parsed.inspection && !sameDateValue(parsed.inspection, linea.inspection)) {
        updateLinea.inspection = parsed.inspection;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] inspection: ${linea.inspection || "—"} → ${parsed.inspection}`
        );
      }

      if (parsed.booking && !sameDateValue(parsed.booking, linea.booking)) {
        updateLinea.booking = parsed.booking;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] booking: ${linea.booking || "—"} → ${parsed.booking}`
        );
      }

      if (parsed.closing && !sameDateValue(parsed.closing, linea.closing)) {
        updateLinea.closing = parsed.closing;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] closing: ${linea.closing || "—"} → ${parsed.closing}`
        );
      }

      if (parsed.shipping_date && !sameDateValue(parsed.shipping_date, linea.shipping_date)) {
        updateLinea.shipping_date = parsed.shipping_date;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] shipping_date: ${linea.shipping_date || "—"} → ${parsed.shipping_date}`
        );
      }

      // -------------------------------------------------------------
      // TRIALS & FINISH DATE (China sólo fechas)
      // -------------------------------------------------------------
      if (parsed.newTrialUpper && !sameDateValue(parsed.newTrialUpper, linea.trial_upper)) {
        updateLinea.trial_upper = parsed.newTrialUpper;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] trial_upper: ${linea.trial_upper || "—"} → ${parsed.newTrialUpper}`
        );
      }

      if (
        parsed.newTrialLasting &&
        !sameDateValue(parsed.newTrialLasting, linea.trial_lasting)
      ) {
        updateLinea.trial_lasting = parsed.newTrialLasting;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] trial_lasting: ${linea.trial_lasting || "—"} → ${parsed.newTrialLasting}`
        );
      }

      if (parsed.newLasting && !sameDateValue(parsed.newLasting, linea.lasting)) {
        updateLinea.lasting = parsed.newLasting;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] lasting: ${linea.lasting || "—"} → ${parsed.newLasting}`
        );
      }

      if (parsed.newFinishDate && !sameDateValue(parsed.newFinishDate, linea.finish_date)) {
        updateLinea.finish_date = parsed.newFinishDate;
        pushChange(
          cambios,
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] finish_date: ${linea.finish_date || "—"} → ${parsed.newFinishDate}`
        );
      }

      if (Object.keys(updateLinea).length > 0) {
        const { error: updErr } = await supabase
          .from("lineas_pedido")
          .update(updateLinea)
          .eq("id", parsed.lineaId);

        if (updErr) {
          errores.push(
            `[PO ${poNumber}] [Ref ${refBD}] Error actualizando lineas_pedido (${parsed.lineaId}): ${updErr.message}`
          );
        } else {
          lineasActualizadas++;
        }
      }

      // -------------------------------------------------------------
      // MUESTRAS (China sólo fechas reales)
      // -------------------------------------------------------------
      for (const tipo of Object.keys(parsed.muestras)) {
        const nuevaFecha = parsed.muestras[tipo];
        if (!nuevaFecha) continue;

        const existente = linea.muestras?.find((m: any) => m.tipo_muestra === tipo);
        if (!existente) {
          avisos.push(
            `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] Muestra ${tipo} no existe.`
          );
          continue;
        }

        const oldFecha = existente.fecha_muestra;

        if (!sameDateValue(nuevaFecha, oldFecha)) {
          const { error: updMErr } = await supabase
            .from("muestras")
            .update({ fecha_muestra: nuevaFecha })
            .eq("id", existente.id);

          if (updMErr) {
            errores.push(
              `[PO ${poNumber}] [Ref ${refBD}] Error actualizando muestra ${tipo} (${existente.id}): ${updMErr.message}`
            );
          } else {
            muestrasActualizadas++;
            pushChange(
              cambios,
              `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] Muestra ${tipo}: ${oldFecha || "—"} → ${nuevaFecha}`
            );
          }
        }
      }
    }

    // -------------------------------------------------------------
    // RESPUESTA FINAL
    // -------------------------------------------------------------
    return NextResponse.json({
      status: errores.length > 0 ? "partial" : "ok",
      pos_encontrados: posEncontrados.size,
      lineas_actualizadas: lineasActualizadas,
      muestras_actualizadas: muestrasActualizadas,
      avisos,
      errores,
      detalles: { cambios },
    });
  } catch (error: any) {
    console.error("Error import-china:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
