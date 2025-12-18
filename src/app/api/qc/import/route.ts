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
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

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

    // ============================================================
    // 1) CABECERA — USANDO .text (CRÍTICO)
    // ============================================================
    const reportNumber   = readCellText(sheet, "B1");
    const inspectionType = readCellText(sheet, "B2");
    const factory        = readCellText(sheet, "B3");
    const customer       = readCellText(sheet, "B4");
    const season         = readCellText(sheet, "B5");
    const inspectionDate = parseExcelDate(sheet.getCell("B6").value);

    const poNumber  = readCellText(sheet, "B9");
    const reference = readCellText(sheet, "B10");
    const style     = readCellText(sheet, "B11");
    const color     = readCellText(sheet, "B12");
    const inspector = readCellText(sheet, "B13");

    if (!reportNumber) {
      return NextResponse.json(
        { error: "report_number vacío (B1)" },
        { status: 400 }
      );
    }

    // ============================================================
    // 2) BLOQUE AQL
    // ============================================================
    const qtyPo        = toInt(sheet.getCell("B28").value);
    const qtyInspected = toInt(sheet.getCell("B29").value);

    const criticalAllowed = toInt(sheet.getCell("B30").value);
    const majorAllowed    = toInt(sheet.getCell("B31").value);
    const minorAllowed    = toInt(sheet.getCell("B32").value);

    const criticalFound = toInt(sheet.getCell("C30").value);
    const majorFound    = toInt(sheet.getCell("C31").value);
    const minorFound    = toInt(sheet.getCell("C32").value);

    const aqlResult = readCellText(sheet, "B33");
    const aqlLevel  = extractAqlLevel(sheet);

    // ============================================================
    // 3) PO
    // ============================================================
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

    // ============================================================
    // 4) UPSERT INSPECTION (ANTI DUPLICADOS)
    // ============================================================
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

    const { data: inspection, error } = await supabase
      .from("qc_inspections")
      .upsert(payload, { onConflict: "report_number" })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    return NextResponse.json({
      ok: true,
      inspection_id: inspection.id,
      report_number: reportNumber,
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

function readCellText(
  sheet: ExcelJS.Worksheet,
  address: string
): string {
  const cell = sheet.getCell(address);
  if (!cell) return "";
  return (cell.text || "").trim();
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    return ExcelJS.DateUtils.excelToJsDate(value)
      .toISOString()
      .slice(0, 10);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function extractAqlLevel(sheet: ExcelJS.Worksheet): string | null {
  const cells = ["F27", "G27", "H27", "F28", "G28", "H28"];
  for (const c of cells) {
    const v = sheet.getCell(c).text;
    if (/LEVEL/i.test(v)) return v.trim();
  }
  return null;
}
