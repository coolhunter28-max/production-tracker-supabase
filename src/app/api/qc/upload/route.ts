import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { uploadToR2 } from "@/lib/r2";
import { extractExcelImages } from "@/lib/extractExcelImages";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.getWorksheet("Inspection Report");

    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet 'Inspection Report' not found" },
        { status: 400 }
      );
    }

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

    const qtyInspected =
      findNumericValueByLabel(sheet, ["QTY INSPECTED", "检验数量"]) ||
      toInt(sheet.getCell("B7").value);

    const poNumber = cell(sheet, "B9");
    const reference = cell(sheet, "B10");
    const style = cell(sheet, "B11");
    const color = cell(sheet, "B12");
    const inspector = cell(sheet, "B13");

    const qtyPo = await getQtyPoFromDatabase(poNumber, reference, style, color);

    const defectsDraft = extractDefects(sheet);

    const criticalFound = sumDefectsByType(defectsDraft, "critical");
    const majorFound = sumDefectsByType(defectsDraft, "major");
    const minorFound = sumDefectsByType(defectsDraft, "minor");

    const aqlLevel = extractAqlLevel(sheet);
    const aqlResult = "";

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
          critical_allowed: 0,
          major_allowed: 0,
          minor_allowed: 0,
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

    await supabase.from("qc_defects").delete().eq("inspection_id", inspectionId);

    const defectsToInsert = defectsDraft.map((defect) => ({
      inspection_id: inspectionId,
      defect_id: defect.defect_id,
      defect_type: defect.defect_type,
      defect_category: defect.defect_category,
      defect_description: defect.defect_description,
      defect_quantity: defect.defect_quantity,
      action_status: "open",
    }));

    if (defectsToInsert.length > 0) {
      const { error } = await supabase
        .from("qc_defects")
        .insert(defectsToInsert);

      if (error) throw error;
    }

    const images = await extractExcelImages(workbook);

    const ppsImages = (images || []).filter((img: any) => {
      return String(img.sheetName || "").trim() === "Style Views";
    });

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

      const fileBuffer: Buffer = img.buffer;
      const ext = String(img.extension || "jpg").toLowerCase();

      const fileName = `pps_${i + 1}.${ext}`;
      const key = `qc/pps/${safePart(po.po)}/${safePart(reference)}/${safePart(
        style
      )}/${safePart(color)}/${fileName}`;

      const contentType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

      const publicUrl = await uploadToR2({
        file: fileBuffer,
        fileName: key,
        contentType,
      });

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

    return NextResponse.json({
      ok: true,
      inspection_id: inspectionId,
      report_number: reportNumber,
      qty_inspected: qtyInspected,
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

function cell(sheet: ExcelJS.Worksheet, address: string): string {
  return normalizeCellText(
    sheet.getCell(address).value || sheet.getCell(address).text
  );
}

function normalizeCellText(value: any): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if ("text" in value) return String(value.text ?? "").trim();
    if ("result" in value) return normalizeCellText(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r: any) => r.text ?? "").join("").trim();
    }
  }

  return String(value).trim();
}

function normalizeSearchText(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

function normalizeMatchText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function toInt(value: any): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "object") {
    if ("result" in value) return toInt(value.result);
    if ("text" in value) return toInt(value.text);
  }

  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);

  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: any): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function findNumericValueByLabel(
  sheet: ExcelJS.Worksheet,
  labels: string[]
): number {
  const normalizedLabels = labels.map(normalizeSearchText);

  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 80); rowNumber++) {
    const row = sheet.getRow(rowNumber);

    for (
      let colNumber = 1;
      colNumber <= Math.min(sheet.columnCount, 20);
      colNumber++
    ) {
      const currentText = normalizeSearchText(
        normalizeCellText(
          row.getCell(colNumber).value || row.getCell(colNumber).text
        )
      );

      const matches = normalizedLabels.some((label) =>
        currentText.includes(label)
      );

      if (!matches) continue;

      for (let offset = 1; offset <= 8; offset++) {
        const candidateCell = row.getCell(colNumber + offset);
        const candidate = toInt(candidateCell.value || candidateCell.text);

        if (candidate > 0) return candidate;
      }
    }
  }

  return 0;
}

function extractAqlLevel(sheet: ExcelJS.Worksheet): string | null {
  const candidates = ["D28", "E28", "F28", "G28", "H28", "D29", "E29", "F29"];

  for (const address of candidates) {
    const value = cell(sheet, address);

    if (value && value.toUpperCase().includes("LEVEL")) {
      return value;
    }
  }

  return null;
}

type DefectDraft = {
  defect_id: string;
  defect_type: string | null;
  defect_category: string | null;
  defect_description: string | null;
  defect_quantity: number;
};

function findDefectHeaderRow(sheet: ExcelJS.Worksheet): number {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 80); rowNumber++) {
    const row = sheet.getRow(rowNumber);

    let hasDefectId = false;
    let hasDefectType = false;
    let hasDefectsFound = false;

    for (
      let colNumber = 1;
      colNumber <= Math.min(sheet.columnCount, 20);
      colNumber++
    ) {
      const text = normalizeSearchText(
        normalizeCellText(
          row.getCell(colNumber).value || row.getCell(colNumber).text
        )
      );

      if (text.includes("DEFECT ID")) hasDefectId = true;
      if (text.includes("DEFECT TYPE")) hasDefectType = true;
      if (text.includes("DEFECTS FOUND")) hasDefectsFound = true;
    }

    if (hasDefectId && hasDefectType && hasDefectsFound) {
      return rowNumber;
    }
  }

  return 15;
}

function isNonDefectBlock(...values: Array<string | null | undefined>): boolean {
  const text = values.join(" ").toLowerCase();

  return (
    text.includes("po quantity") ||
    text.includes("采购订单数量") ||
    text.includes("acceptance quality limit") ||
    text.includes("aql") ||
    text.includes("inspection summary")
  );
}

function extractDefects(sheet: ExcelJS.Worksheet): DefectDraft[] {
  const headerRow = findDefectHeaderRow(sheet);
  const startRow = headerRow + 1;
  const endRow = Math.min(startRow + 40, sheet.rowCount);

  const defects: DefectDraft[] = [];

  for (let row = startRow; row <= endRow; row++) {
    const defectId = cell(sheet, `A${row}`);
    const defectType = cell(sheet, `B${row}`);
    const defectQty = toInt(sheet.getCell(`C${row}`).value);
    const defectCategory = cell(sheet, `D${row}`);
    const defectDescription = cell(sheet, `E${row}`);

    if (
      isNonDefectBlock(
        defectId,
        defectType,
        defectCategory,
        defectDescription
      )
    ) {
      continue;
    }

    const hasDefect =
      defectId ||
      defectType ||
      defectQty > 0 ||
      defectCategory ||
      defectDescription;

    if (!hasDefect) continue;
    if (defectQty <= 0) continue;

    defects.push({
      defect_id: defectId || `D${defects.length + 1}`,
      defect_type: defectType || null,
      defect_category: defectCategory || null,
      defect_description: defectDescription || null,
      defect_quantity: defectQty,
    });
  }

  return defects;
}

function sumDefectsByType(defects: DefectDraft[], type: string): number {
  return defects
    .filter((defect) =>
      String(defect.defect_type ?? "").toLowerCase().includes(type)
    )
    .reduce((sum, defect) => sum + defect.defect_quantity, 0);
}

async function getQtyPoFromDatabase(
  poNumber: string,
  reference: string,
  style: string,
  color: string
): Promise<number> {
  const { data, error } = await supabase
    .from("lineas_pedido")
    .select("qty")
    .eq("po", poNumber)
    .eq("reference", reference)
    .eq("style", style)
    .eq("color", color);

  if (error || !data) return 0;

  return data.reduce((sum: number, row: any) => sum + Number(row.qty ?? 0), 0);
}

function safePart(value: any): string {
  return String(value ?? "unknown")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);
}