import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { extractExcelImages } from "@/lib/extractExcelImages";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function get(sheet: ExcelJS.Worksheet, cell: string) {
  return sheet.getCell(cell).value
    ? String(sheet.getCell(cell).value).trim()
    : "";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // --------------------------------------------------
    // 1) Leer Excel
    // --------------------------------------------------
    const buf = Buffer.from(await file.arrayBuffer());
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buf);

// 🔽 PRUEBA DE IMÁGENES
const images = await extractExcelImages(workbook);

console.log(
  images.map((i) => ({
    sheet: i.sheetName,
    size: i.buffer.length,
    ext: i.extension,
  }))
);

    const sheet = workbook.getWorksheet("Inspection Report");
    if (!sheet) {
      return NextResponse.json(
        { error: "Sheet 'Inspection Report' not found" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2) Datos principales
    // --------------------------------------------------
    const poNumber = get(sheet, "B9");
    const reference = get(sheet, "B10");
    const style = get(sheet, "B11");
    const color = get(sheet, "B12");
    const inspector = get(sheet, "B13");

    const qtyPO = Number(get(sheet, "C28")) || 0;
    const qtyInspected = Number(get(sheet, "C29")) || 0;

    const criticalAllowed = Number(get(sheet, "B30")) || 0;
    const majorAllowed = Number(get(sheet, "B31")) || 0;
    const minorAllowed = Number(get(sheet, "B32")) || 0;

    const totalCritical = Number(get(sheet, "C30")) || 0;
    const totalMajor = Number(get(sheet, "C31")) || 0;
    const totalMinor = Number(get(sheet, "C32")) || 0;

    const aqlResult = get(sheet, "B33"); // Conform / Not conform
    const aqlLevel = get(sheet, "D28");  // LEVEL II, etc.

    // --------------------------------------------------
    // 3) Leer defectos (D1–D10)
    // --------------------------------------------------
    const defectos: any[] = [];

    for (let row = 16; row <= 25; row++) {
      const defect_id = get(sheet, `A${row}`);
      const defect_type = get(sheet, `B${row}`);
      const defect_qty = Number(get(sheet, `C${row}`)) || 0;
      const defect_category = get(sheet, `D${row}`);
      const defect_desc = get(sheet, `E${row}`);

      if (!defect_id || defect_qty === 0) continue;

      defectos.push({
        defect_id,
        defect_type,
        defect_quantity: defect_qty,
        defect_category,
        defect_description: defect_desc,
      });
    }

    // --------------------------------------------------
    // 4) Buscar PO
    // --------------------------------------------------
    const { data: po, error: poError } = await supabase
      .from("pos")
      .select("id, po")
      .eq("po", poNumber)
      .maybeSingle();

    if (poError) throw poError;

    if (!po) {
      return NextResponse.json(
        {
          error: "PO not found in system",
          poNumber,
          reference,
          style,
          color,
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5) Insertar QC INSPECTION
    // --------------------------------------------------
    const { data: inspection, error: inspectionError } = await supabase
      .from("qc_inspections")
      .insert({
        po_id: po.id,
        po_number: poNumber,
        reference,
        style,
        color,
        inspector,
        qty_po: qtyPO,
        qty_inspected: qtyInspected,
        aql_level: aqlLevel,
        aql_result: aqlResult,
        critical_allowed: criticalAllowed,
        major_allowed: majorAllowed,
        minor_allowed: minorAllowed,
        critical_found: totalCritical,
        major_found: totalMajor,
        minor_found: totalMinor,
      })
      .select()
      .single();

    if (inspectionError) throw inspectionError;

    // --------------------------------------------------
    // 6) Insertar DEFECTOS
    // --------------------------------------------------
    for (const d of defectos) {
      await supabase.from("qc_defects").insert({
        inspection_id: inspection.id,
        ...d,
      });
    }

    // --------------------------------------------------
    // 7) Respuesta
    // --------------------------------------------------
    return NextResponse.json({
      status: "ok",
      inspection_id: inspection.id,
      defectos_insertados: defectos.length,
    });

  } catch (err: any) {
    console.error("QC Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
