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
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    
    await workbook.xlsx.load(arrayBuffer);

for (const ws of workbook.worksheets) {
  console.log(ws.name, "images:", ws.getImages().length);
}

const sheet = workbook.getWorksheet("Inspection Report");
    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet 'Inspection Report' not found" },
        { status: 400 }
      );
    }

    const reportNumber = readCellText(sheet, "B1");
    const inspectionType = readCellText(sheet, "B2");
    const factory = readCellText(sheet, "B3");
    const customer = readCellText(sheet, "B4");
    const season = readCellText(sheet, "B5");
    const inspectionDate = parseExcelDate(sheet.getCell("B6").value);

    const poNumber = readCellText(sheet, "B9");
    const reference = readCellText(sheet, "B10");
    const style = readCellText(sheet, "B11");
    const color = readCellText(sheet, "B12");
    const inspector = readCellText(sheet, "B13");

    if (!reportNumber) {
      return NextResponse.json(
        { error: "report_number vacío (B1)" },
        { status: 400 }
      );
    }

    const qtyPo = toInt(sheet.getCell("B28").value);
    const qtyInspected = toInt(sheet.getCell("B29").value);

    const criticalAllowed = toInt(sheet.getCell("B30").value);
    const majorAllowed = toInt(sheet.getCell("B31").value);
    const minorAllowed = toInt(sheet.getCell("B32").value);

    const criticalFound = toInt(sheet.getCell("C30").value);
    const majorFound = toInt(sheet.getCell("C31").value);
    const minorFound = toInt(sheet.getCell("C32").value);

    const aqlResult = readCellText(sheet, "B33");
    const aqlLevel = extractAqlLevel(sheet);

    const { data: poRow } = await supabase
      .from("pos")
      .select("id")
      .eq("po", poNumber)
      .maybeSingle();

    if (!poRow) {
      return NextResponse.json(
        { error: `PO ${poNumber} not found` },
        { status: 404 }
      );
    }

    const payload = {
      report_number: reportNumber,
      po_id: poRow.id,
      po_number: poNumber,
      reference,
      style,
      color,
      inspector,
      inspection_type: inspectionType,
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
    };

    const { data: inspection, error: inspectionError } = await supabase
      .from("qc_inspections")
      .upsert(payload, { onConflict: "report_number" })
      .select("*")
      .single();

    if (inspectionError) {
      throw inspectionError;
    }

    const defects = extractDefects(sheet, inspection.id);

    const { error: deleteError } = await supabase
      .from("qc_defects")
      .delete()
      .eq("inspection_id", inspection.id);

    if (deleteError) {
      throw deleteError;
    }

    if (defects.length > 0) {
      const { error: defectsError } = await supabase
        .from("qc_defects")
        .insert(defects);

      if (defectsError) {
        throw defectsError;
      }
    }

    return NextResponse.json({
      ok: true,
      inspection_id: inspection.id,
      report_number: reportNumber,
      defects: defects.length,
    });
  } catch (err: any) {
    console.error("QC import error:", err);

    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}

/* ================= HELPERS ================= */

function readCellText(sheet: ExcelJS.Worksheet, address: string): string {
  const cell = sheet.getCell(address);
  if (!cell) return "";
  return (cell.text || "").trim();
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function toInt(value: any): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "object" && "result" in value) {
    return toInt(value.result);
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function extractAqlLevel(sheet: ExcelJS.Worksheet): string | null {
  const cells = ["F27", "G27", "H27", "F28", "G28", "H28"];

  for (const c of cells) {
    const value = sheet.getCell(c).text;
    if (/LEVEL/i.test(value)) return value.trim();
  }

  return null;
}

function findDefectHeaderRow(sheet: ExcelJS.Worksheet): number {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 80); rowNumber++) {
    const row = sheet.getRow(rowNumber);

    let hasDefectId = false;
    let hasDefectType = false;
    let hasDefectsFound = false;

    row.eachCell((cell) => {
      const text = normalizeText(cell.text);

      if (text.includes("DEFECT ID")) hasDefectId = true;
      if (text.includes("DEFECT TYPE")) hasDefectType = true;
      if (text.includes("DEFECTS FOUND")) hasDefectsFound = true;
    });

    if (hasDefectId && hasDefectType && hasDefectsFound) {
      return rowNumber;
    }
  }

  return 15;
}

function extractDefects(sheet: ExcelJS.Worksheet, inspectionId: string) {
  const headerRowNumber = findDefectHeaderRow(sheet);
  const startRow = headerRowNumber + 1;
  const endRow = Math.min(startRow + 40, sheet.rowCount);

  const defects: Array<{
    inspection_id: string;
    defect_id: string | null;
    defect_type: string | null;
    defect_category: string | null;
    defect_description: string | null;
    defect_quantity: number;
    action_plan: string | null;
    action_status: string;
  }> = [];

  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
    const defectId = readCellText(sheet, `A${rowNumber}`);
    const defectType = readCellText(sheet, `B${rowNumber}`);
    const defectQuantity = toInt(sheet.getCell(`C${rowNumber}`).value);
    const defectCategory = readCellText(sheet, `D${rowNumber}`);
    const defectDescription = readCellText(sheet, `E${rowNumber}`);
    const actionPlan = readCellText(sheet, `H${rowNumber}`);

    const hasDefect =
      defectType ||
      defectQuantity > 0 ||
      defectCategory ||
      defectDescription ||
      actionPlan;

    if (!hasDefect) continue;

    defects.push({
      inspection_id: inspectionId,
      defect_id: defectId || null,
      defect_type: defectType || null,
      defect_category: defectCategory || null,
      defect_description: defectDescription || null,
      defect_quantity: defectQuantity,
      action_plan: actionPlan || null,
      action_status: "OPEN",
    });
  }

  return defects;
}