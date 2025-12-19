import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { extractExcelImages } from "@/lib/extractExcelImages";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function cell(sheet: ExcelJS.Worksheet, ref: string): string {
  const v = sheet.getCell(ref).value;
  return v ? String(v).trim() : "";
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: any): string | null {
  if (!v) return null;

  if (typeof v === "number") {
    const d = ExcelJS.DateUtils.excelToJsDate(v);
    return d.toISOString().slice(0, 10);
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Limpia strings para usarlos en rutas de R2 (sin espacios raros)
function safePart(input: string): string {
  return (input || "unknown")
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
}

// --------------------------------------------------
// POST
// --------------------------------------------------
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // --------------------------------------------------
    // 1) Leer Excel
    // --------------------------------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Inspection Report");
    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet 'Inspection Report' not found" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2) CABECERA
    // --------------------------------------------------
    const reportNumber = cell(sheet, "B1");
    if (!reportNumber) {
      return NextResponse.json(
        { error: "Missing report_number (B1)" },
        { status: 400 }
      );
    }

    const inspectionType = cell(sheet, "B2");
    const factory = cell(sheet, "B3");
    const customer = cell(sheet, "B4");
    const season = cell(sheet, "B5");
    const inspectionDate = parseDate(sheet.getCell("B6").value);

    const poNumber = cell(sheet, "B9");
    const reference = cell(sheet, "B10");
    const style = cell(sheet, "B11");
    const color = cell(sheet, "B12");
    const inspector = cell(sheet, "B13");

    // --------------------------------------------------
    // 3) AQL
    // --------------------------------------------------
    const qtyPo = toInt(sheet.getCell("B28").value);
    const qtyInspected = toInt(sheet.getCell("B29").value);

    const criticalAllowed = toInt(sheet.getCell("B30").value);
    const majorAllowed = toInt(sheet.getCell("B31").value);
    const minorAllowed = toInt(sheet.getCell("B32").value);

    const criticalFound = toInt(sheet.getCell("C30").value);
    const majorFound = toInt(sheet.getCell("C31").value);
    const minorFound = toInt(sheet.getCell("C32").value);

    const aqlResult = cell(sheet, "B33");
    const aqlLevel = cell(sheet, "D28") || null;

    // --------------------------------------------------
    // 4) Buscar PO
    // --------------------------------------------------
    const { data: po, error: poErr } = await supabase
      .from("pos")
      .select("id, po")
      .eq("po", poNumber)
      .maybeSingle();

    if (poErr) throw poErr;

    if (!po) {
      return NextResponse.json(
        { error: `PO ${poNumber} not found` },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5) UPSERT qc_inspections
    // --------------------------------------------------
    const { data: inspection, error: inspErr } = await supabase
      .from("qc_inspections")
      .upsert(
        {
          report_number: reportNumber,
          po_id: po.id,
          po_number: poNumber,
          reference,
          style,
          color,
          inspector,
          inspection_type: inspectionType || null,
          inspection_date: inspectionDate,
          season,
          customer,
          factory,
          qty_po: qtyPo,
          qty_inspected: qtyInspected,
          aql_level: aqlLevel,
          aql_result: aqlResult,
          critical_allowed: criticalAllowed,
          major_allowed: majorAllowed,
          minor_allowed: minorAllowed,
          critical_found: criticalFound,
          major_found: majorFound,
          minor_found: minorFound,
        },
        { onConflict: "report_number" }
      )
      .select("*")
      .single();

    if (inspErr || !inspection) throw inspErr;

    const inspectionId = inspection.id;

    // --------------------------------------------------
    // 6) LIMPIEZA DEFECTOS (reimport seguro)
    // --------------------------------------------------
    await supabase
      .from("qc_defects")
      .delete()
      .eq("inspection_id", inspectionId);

    // --------------------------------------------------
    // 7) LEER DEFECTOS (D1–D10) -> schema REAL
    // --------------------------------------------------
    const defectsToInsert: any[] = [];

    for (let row = 16; row <= 25; row++) {
      const defectId = cell(sheet, `A${row}`);
      if (!defectId) continue;

      const defectType = cell(sheet, `B${row}`);
      const defectQty = toInt(sheet.getCell(`C${row}`).value);
      const defectCategory = cell(sheet, `D${row}`);
      const defectDescription = cell(sheet, `E${row}`);

      if (defectQty <= 0) continue;

      defectsToInsert.push({
        inspection_id: inspectionId,
        defect_id: defectId,
        defect_type: defectType || null,
        defect_category: defectCategory || null,
        defect_description: defectDescription || null,
        defect_quantity: defectQty,
      });
    }

    if (defectsToInsert.length > 0) {
      const { error } = await supabase.from("qc_defects").insert(defectsToInsert);
      if (error) throw error;
    }

    // --------------------------------------------------
    // 8) PPS (Style Views) -> R2 + qc_pps_photos
    // --------------------------------------------------
    const images = await extractExcelImages(workbook);

    // Solo Style Views
    const ppsImages = (images || []).filter(
      (img: any) => String(img.sheetName || "").trim() === "Style Views"
    );

    // Reimport seguro PPS: borra las PPS previas del PO+reference+style+color
    // (no borramos de R2 aquí porque tu tabla no guarda la key; si quieres, lo hacemos después)
    await supabase
      .from("qc_pps_photos")
      .delete()
      .eq("po_id", po.id)
      .eq("reference", reference)
      .eq("style", style)
      .eq("color", color);

    let ppsImagesInserted = 0;

    for (let i = 0; i < ppsImages.length; i++) {
      const img: any = ppsImages[i];

      // Ajusta aquí si tu helper usa otros nombres:
      const fileBuffer: Buffer = img.buffer; // <- si fuera img.file o img.data, cámbialo aquí
      const ext = (img.extension || "jpg").toLowerCase();

      const fileName = `pps_${i + 1}.${ext}`;
      const key = `qc/pps/${safePart(po.po)}/${safePart(reference)}/${safePart(
        style
      )}/${safePart(color)}/${fileName}`;

      const contentType =
        ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      // 1) Subir a R2
      const publicUrl = await uploadToR2({
        file: fileBuffer,
        fileName: key,
        contentType,
      });

      // 2) Guardar en Supabase
      const { error } = await supabase.from("qc_pps_photos").insert({
        po_id: po.id,
        reference,
        style,
        color,
        photo_url: publicUrl,
        photo_name: fileName,
        photo_order: i + 1,
      });

      if (error) {
        console.error("PPS photo insert error:", error);
      } else {
        ppsImagesInserted++;
      }
    }

    // --------------------------------------------------
    // 9) RESPUESTA
    // --------------------------------------------------
    return NextResponse.json({
      ok: true,
      inspection_id: inspectionId,
      report_number: reportNumber,
      defects: defectsToInsert.length,
      pps_images: ppsImagesInserted,
    });
  } catch (err: any) {
    console.error("QC Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
