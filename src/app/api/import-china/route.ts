// src/app/api/import-china/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function parseSCO(value: any): string | null {
  if (!value) return null;

  if (typeof value === "object") {
    if ("text" in value && (value as any).text) {
      return String((value as any).text);
    }
    if ("richText" in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((r: any) => r.text).join("");
    }
  }

  return String(value);
}

// -------------------------------------------------------------
// API POST
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("China");
    if (!sheet) {
      return NextResponse.json(
        { error: "Worksheet 'China' not found" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------
    // CONTADORES E INFORME
    // -------------------------------------------------------------
    const avisos: string[] = [];
    const errores: string[] = [];
    const cambios: string[] = [];

    const posActualizados = new Set<string>();
    let lineasActualizadas = 0;
    let muestrasActualizadas = 0;

    const DATA_START = 4; // cabeceras están en fila 3

    for (let rowIndex = DATA_START; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      // -------------------------------------------------------------
      // IDENTIFICADORES DEL EXCEL
      // -------------------------------------------------------------
      const lineaId = parseSCO(row.getCell(1).value); // SCO → columna A
      if (!lineaId) continue;

      const excelRef = row.getCell(7).value ? String(row.getCell(7).value) : "-";
      const excelStyle = row.getCell(8).value ? String(row.getCell(8).value) : "-";
      const excelColor = row.getCell(9).value ? String(row.getCell(9).value) : "-";
      const excelPO = row.getCell(6).value ? String(row.getCell(6).value) : "-";

      // -------------------------------------------------------------
      // BUSCAR LÍNEA EN BD
      // -------------------------------------------------------------
      const { data: linea, error: lineaError } = await supabase
        .from("lineas_pedido")
        .select(
          `
            id,
            po_id,
            reference,
            style,
            color,
            trial_upper,
            trial_lasting,
            lasting,
            finish_date,
            muestras ( id, tipo_muestra, fecha_muestra )
          `
        )
        .eq("id", lineaId)
        .single();

      if (lineaError || !linea) {
        errores.push(
          `[PO ${excelPO}] [Ref ${excelRef}] [Style ${excelStyle}] [Color ${excelColor}] ` +
            `[SCO ${lineaId}] Línea no existe en BD (no se ha podido actualizar).`
        );
        continue;
      }

      // Obtener PO "humano" para el reporte
      let poNumber = excelPO;
      try {
        const { data: poRow } = await supabase
          .from("pos")
          .select("po")
          .eq("id", linea.po_id)
          .single();
        if (poRow?.po) poNumber = poRow.po;
      } catch {}

      const refBD = linea.reference || excelRef;
      const styleBD = linea.style || excelStyle;
      const colorBD = linea.color || excelColor;

      posActualizados.add(linea.po_id);

      // -------------------------------------------------------------
      // ACTUALIZAR FECHAS DE TRIALS / FINISH (columnas 26–29)
      // -------------------------------------------------------------
      const newTrialUpper = parseDate(row.getCell(26).value);
      const newTrialLasting = parseDate(row.getCell(27).value);
      const newLasting = parseDate(row.getCell(28).value);
      const newFinishDate = parseDate(row.getCell(29).value);

      const updateLinea: any = {};

      if (newTrialUpper) {
        updateLinea.trial_upper = newTrialUpper;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] trial_upper → ${newTrialUpper}`
        );
      }

      if (newTrialLasting) {
        updateLinea.trial_lasting = newTrialLasting;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] trial_lasting → ${newTrialLasting}`
        );
      }

      if (newLasting) {
        updateLinea.lasting = newLasting;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] lasting → ${newLasting}`
        );
      }

      if (newFinishDate) {
        updateLinea.finish_date = newFinishDate;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] finish_date → ${newFinishDate}`
        );
      }

      if (Object.keys(updateLinea).length > 0) {
        await supabase.from("lineas_pedido").update(updateLinea).eq("id", lineaId);
        lineasActualizadas++;
      }

      // -------------------------------------------------------------
      // ACTUALIZAR MUESTRAS (CFM, COUNTER, FITTING, PPS, TESTING, SHIPPING)
      // -------------------------------------------------------------
      const muestraMapping = {
        CFMS: parseDate(row.getCell(15).value),
        COUNTERS: parseDate(row.getCell(17).value),
        FITTINGS: parseDate(row.getCell(19).value),
        PPS: parseDate(row.getCell(21).value),
        TESTINGS: parseDate(row.getCell(23).value),
        SHIPPINGS: parseDate(row.getCell(25).value),
      };

      for (const tipo of Object.keys(muestraMapping)) {
        const nuevaFecha = muestraMapping[tipo];
        if (!nuevaFecha) continue;

        const existente = linea.muestras?.find(
          (m: any) => m.tipo_muestra === tipo
        );

        if (!existente) {
          avisos.push(
            `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] ` +
              `Muestra ${tipo} no existe en BD. Se ignora (no se crea nueva).`
          );
          continue;
        }

        await supabase
          .from("muestras")
          .update({ fecha_muestra: nuevaFecha })
          .eq("id", existente.id);

        muestrasActualizadas++;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] ` +
            `Muestra ${tipo} → fecha_muestra = ${nuevaFecha}`
        );
      }

      // -------------------------------------------------------------
      // CAMPOS EDITABLES DEL PO (Inspection, Booking...)
      // -------------------------------------------------------------
      const inspection = parseDate(row.getCell(31).value);
      const booking = parseDate(row.getCell(32).value);
      const closing = parseDate(row.getCell(33).value);
      const shipping_date = parseDate(row.getCell(34).value);

      const updatePO: any = {};

      if (inspection) {
        updatePO.inspection = inspection;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] inspection → ${inspection}`
        );
      }

      if (booking) {
        updatePO.booking = booking;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] booking → ${booking}`
        );
      }

      if (closing) {
        updatePO.closing = closing;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] closing → ${closing}`
        );
      }

      if (shipping_date) {
        updatePO.shipping_date = shipping_date;
        cambios.push(
          `[PO ${poNumber}] [Ref ${refBD}] [Style ${styleBD}] [Color ${colorBD}] shipping_date → ${shipping_date}`
        );
      }

      if (Object.keys(updatePO).length > 0) {
        await supabase.from("pos").update(updatePO).eq("id", linea.po_id);
      }
    }

    // -------------------------------------------------------------
    // RESPUESTA FINAL
    // -------------------------------------------------------------
    return NextResponse.json({
      status: "ok",
      pos_encontrados: posActualizados.size,
      lineas_actualizadas: lineasActualizadas,
      muestras_actualizadas: muestrasActualizadas,
      avisos,
      errores,
      detalles: {
        cambios,
      },
    });
  } catch (error: any) {
    console.error("Error import-china:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
