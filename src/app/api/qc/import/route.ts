// src/app/api/qc/import/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Inspection Report");
    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet 'Inspection Report' not found" },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------
    // 1) LEER CABECERA (ajusta las celdas a tu plantilla real)
    // ----------------------------------------------------------------
    const poNumber = String(sheet.getCell("B9").value || "").trim();      // PO NUMBER
    const reference = String(sheet.getCell("B10").value || "").trim();     // REFERENCE
    const style = String(sheet.getCell("B11").value || "").trim();        // STYLE
    const color = String(sheet.getCell("B12").value || "").trim();        // COLOR

    const season = String(sheet.getCell("B6").value || "").trim();
    const customer = String(sheet.getCell("B5").value || "").trim();
    const factory = String(sheet.getCell("B4").value || "").trim();
    const inspectionDateRaw = sheet.getCell("B7").value;
    const inspectorName = String(sheet.getCell("B13").value || "").trim();

    const inspectionDate = parseExcelDate(inspectionDateRaw);

    // AQL / cantidad / resultado (ajusta rangos)
    const qtyInspected =
      Number(sheet.getCell("B18").value) || null;
    const aqlLevel = String(sheet.getCell("B21").value || "").trim();
    const result = String(sheet.getCell("B27").value || "").trim(); // "Conform / Not conform"

    // ----------------------------------------------------------------
    // 2) LOCALIZAR PO / LÍNEA EN SUPABASE
    //    De momento por PO+REF+STYLE+COLOR
    // ----------------------------------------------------------------
    const { data: poRow } = await supabase
      .from("pos")
      .select("id, po")
      .eq("po", poNumber)
      .maybeSingle();

    if (!poRow) {
      return NextResponse.json(
        { error: `PO ${poNumber} not found in DB` },
        { status: 404 }
      );
    }

    const { data: lineaRow } = await supabase
      .from("lineas_pedido")
      .select("id")
      .eq("po_id", poRow.id)
      .eq("reference", reference)
      .eq("style", style)
      .eq("color", color)
      .maybeSingle();

    // lineaRow puede ser null si hay varias combinaciones; en ese caso
    // podrías dejar linea_pedido_id en null por ahora.

    // ----------------------------------------------------------------
    // 3) CREAR qc_inspections
    // ----------------------------------------------------------------
    const { data: inspectionInsert, error: inspectionError } =
      await supabase
        .from("qc_inspections")
        .insert({
          po_id: poRow.id,
          linea_pedido_id: lineaRow?.id || null,
          inspection_type: inferInspectionType(sheet), // función helper
          inspection_date: inspectionDate,
          season,
          customer,
          factory,
          inspector_name: inspectorName,
          qty_inspected: qtyInspected,
          aql_level: aqlLevel,
          result,
        })
        .select("*")
        .single();

    if (inspectionError || !inspectionInsert) {
      console.error("Error inserting qc_inspections:", inspectionError);
      return NextResponse.json(
        { error: "Error inserting inspection" },
        { status: 500 }
      );
    }

    const inspectionId = inspectionInsert.id;

    // ----------------------------------------------------------------
    // 4) LEER TABLA DE DEFECTOS D1..D10
    //    Ajusta filaInicial/filaFinal/columnas a tu plantilla real
    // ----------------------------------------------------------------
    const defectRowsStart = 25; // fila donde empieza D1
    const defectRowsEnd = 34;   // fila donde acaba D10 (por ejemplo)

    type DefectRow = {
      code: string;          // D1, D2...
      type: string;          // Critical / Major / Minor
      found: number;         // nº pcs
      category: string;
      description: string;
    };

    const defects: DefectRow[] = [];

    for (let rowIndex = defectRowsStart; rowIndex <= defectRowsEnd; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      const defectCode = String(row.getCell(1).value || "").trim();  // col A: DEFECT ID
      if (!defectCode) continue; // fila vacía

      const defectType = String(row.getCell(2).value || "").trim();  // col B: DEFECT TYPE
      const defectsFound =
        Number(row.getCell(3).value || 0);                           // col C: DEFECTS FOUND
      const defectCategory = String(row.getCell(4).value || "").trim(); // col D
      const defectDesc = String(row.getCell(5).value || "").trim();     // col E

      defects.push({
        code: defectCode,
        type: defectType,
        found: defectsFound,
        category: defectCategory,
        description: defectDesc,
      });
    }

    // ----------------------------------------------------------------
    // 5) INSERTAR qc_defects
    // ----------------------------------------------------------------
    const defectRecords: { [code: string]: any } = {};

    for (let i = 0; i < defects.length; i++) {
      const d = defects[i];

      const indexMatch = d.code.match(/D(\d+)/i);
      const idx = indexMatch ? Number(indexMatch[1]) : i + 1;

      const { data: inserted, error: defErr } = await supabase
        .from("qc_defects")
        .insert({
          inspection_id: inspectionId,
          defect_code: d.code,
          defect_index: idx,
          defect_type: d.type,
          defects_found: d.found,
          defect_category: d.category,
          defect_description: d.description,
        })
        .select("*")
        .single();

      if (defErr || !inserted) {
        console.error("Error inserting qc_defects:", defErr);
        continue;
      }

      defectRecords[d.code] = inserted;
    }

    // ----------------------------------------------------------------
    // 6) FOTOS DE CADA DEFECTO (hojas D1..D10)
    // ----------------------------------------------------------------
    // ExcelJS guarda las imágenes en workbook.media y las asigna a los ranges
    // de cada hoja a través de worksheet.getImages()

    // Subir el Excel original al bucket (opcional)
    // const excelPath = `qc/${poNumber}/${file.name}`;
    // await supabase.storage.from("qc-inspections").upload(excelPath, buffer, { upsert: true });

    for (const ws of workbook.worksheets) {
      const name = ws.name.trim();
      const match = name.match(/^D(\d+)/i);
      if (!match) continue;

      const defectCode = `D${match[1]}`;
      const defect = defectRecords[defectCode];
      if (!defect) continue; // no hay fila D1 en la tabla de defectos

      const images = ws.getImages(); // [{imageId, range}, ...]

      for (let i = 0; i < images.length; i++) {
        const imgRef = images[i];
        const img = workbook.getImage(imgRef.imageId);
        if (!img) continue;

        // img.buffer solo está disponible si el Excel se ha cargado desde un buffer,
        // que es nuestro caso.
        const imgBuffer = img.buffer as Buffer;
        const ext =
          img.extension === "jpeg" || img.extension === "jpg"
            ? "jpg"
            : "png";

        const storagePath = `po/${poNumber}/ref_${reference}/color_${color}/${defectCode}/photo_${i +
          1}.${ext}`;

        const { data: uploadRes, error: uploadErr } =
          await supabase.storage
            .from("qc-inspections")
            .upload(storagePath, imgBuffer, {
              upsert: true,
              contentType: ext === "jpg" ? "image/jpeg" : "image/png",
            });

        if (uploadErr) {
          console.error("Error uploading photo:", uploadErr);
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("qc-inspections")
          .getPublicUrl(storagePath);

        await supabase.from("qc_defect_photos").insert({
          defect_id: defect.id,
          url: publicUrl.publicUrl,
          sheet_name: ws.name,
        });
      }
    }

    // ----------------------------------------------------------------
    // 7) RESPUESTA
    // ----------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      inspection_id: inspectionId,
      defects: Object.keys(defectRecords).length,
    });
  } catch (err: any) {
    console.error("QC Import error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HELPERS
// =======================================================

function parseExcelDate(value: any): string | null {
  if (!value) return null;

  // Si viene como número de fecha de Excel
  if (typeof value === "number") {
    const jsDate = ExcelJS.DateUtils.excelToJsDate(value);
    return jsDate.toISOString().slice(0, 10);
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function inferInspectionType(sheet: ExcelJS.Worksheet): string | null {
  // Si en tu cabecera hay un campo "INSPECTION TYPE", léelo directamente.
  // Ejemplo:
  const v = String(sheet.getCell("B2").value || "").trim();
  return v || null;
}
