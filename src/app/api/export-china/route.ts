import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const seasonsRaw = searchParams.get("seasons");
    if (!seasonsRaw) {
      return NextResponse.json(
        { error: "Seasons parameter is required" },
        { status: 400 }
      );
    }

    const seasons = seasonsRaw.split(",").map((s) => s.trim());

    // 1) CONSULTA A SUPABASE (POs + líneas + muestras)
    const { data: pos, error: posError } = await supabase
      .from("pos")
      .select(
        `
        id,
        po,
        supplier,
        customer,
        factory,
        season,
        po_date,
        etd_pi,
        booking,
        closing,
        shipping_date,
        inspection,
        lineas_pedido (
          id,
          reference,
          style,
          color,
          size_run,
          qty,
          price,
          amount,
          trial_upper,
          trial_lasting,
          lasting,
          finish_date,
          muestras (
            id,
            tipo_muestra,
            round,
            fecha_muestra,
            fecha_teorica
          )
        )
      `
      )
      .in("season", seasons);

    if (posError) {
      return NextResponse.json({ error: posError.message }, { status: 500 });
    }

    if (!pos || pos.length === 0) {
      return NextResponse.json(
        { error: "No POs found for selected seasons" },
        { status: 404 }
      );
    }

    // 2) CREAR EXCEL
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("China");

    // --------------------------
    // FILA 1: Production Tracker + fecha (columna B visible)
    // --------------------------
    const exportDate = new Date();
    const infoRow = sheet.addRow([
      "", // A → SCO oculta
      "Production Tracker", // B → título visible
      "",
      "",
      exportDate
    ]);

    infoRow.getCell(2).font = { bold: true, color: { argb: "FF008B8B" } };
    infoRow.getCell(5).numFmt = "dd-mmm-yy";

    // FILA 2: vacía
    sheet.addRow([]);

    // --------------------------
    // HEADERS — fila 3 (incluye SCO en la columna 1)
    // --------------------------
    const HEADERS = [
      "SCO",             // A — oculta (pero visible para la UI)
      "SUPPLIER",        // B
      "SEASON",
      "CUSTOMER",
      "FACTORY",
      "PO",
      "REFERENCE",
      "STYLE",
      "COLOR",
      "SIZE RUN",
      "QTY",
      "PO Date",
      "ETD PI",
      "CFMs Round",
      "CFMs",
      "Counter Sample Round",
      "Counter Sample",
      "Fitting Round",
      "Fitting",
      "PPS Round",
      "PPS",
      "Testing Samples Round",
      "Testing Samples",
      "Shipping Samples Round",
      "Shipping Samples",
      "Trial Upper",
      "Trial Lasting",
      "Lasting",
      "Finish Date",
      "Inspection Round",
      "Inspection",
      "Booking",
      "Closing",
      "Shipping",
      "REMARKS"
    ];

    const headerRow = sheet.addRow(HEADERS);
    headerRow.font = { bold: true };

    const firstDataRow = headerRow.number + 1;

    // 3) RELLENAR FILAS DE DATOS
    for (const poItem of pos) {
      if (!poItem?.lineas_pedido) continue;

      for (const linea of poItem.lineas_pedido) {
        const muestras = (linea.muestras as any[]) ?? [];

        const getByTipo = (tipo: string) =>
          muestras.find((m) => m.tipo_muestra === tipo);

        const cfm = getByTipo("CFMS");
        const counter = getByTipo("COUNTERS");
        const fitting = getByTipo("FITTINGS");
        const pps = getByTipo("PPS");
        const testing = getByTipo("TESTINGS");
        const shipping = getByTipo("SHIPPINGS");

        sheet.addRow([
          // 1 SCO (ID interno)
          linea.id ?? "",
          // 2 SUPPLIER
          poItem.supplier ?? "",
          // 3 SEASON
          poItem.season ?? "",
          // 4 CUSTOMER
          poItem.customer ?? "",
          // 5 FACTORY
          poItem.factory ?? "",
          // 6 PO
          poItem.po ?? "",
          // 7 REFERENCE
          linea.reference ?? "",
          // 8 STYLE
          linea.style ?? "",
          // 9 COLOR
          linea.color ?? "",
          // 10 SIZE RUN
          linea.size_run ?? "",
          // 11 QTY
          linea.qty ?? "",
          // 12 PO Date
          poItem.po_date ?? "",
          // 13 ETD PI
          poItem.etd_pi ?? "",
          // 14 CFMs Round
          cfm?.round ?? "",
          // 15 CFMs (fecha real)
          cfm?.fecha_muestra ?? "",
          // 16 Counter Sample Round
          counter?.round ?? "",
          // 17 Counter Sample (fecha real)
          counter?.fecha_muestra ?? "",
          // 18 Fitting Round
          fitting?.round ?? "",
          // 19 Fitting (fecha real)
          fitting?.fecha_muestra ?? "",
          // 20 PPS Round
          pps?.round ?? "",
          // 21 PPS (fecha real)
          pps?.fecha_muestra ?? "",
          // 22 Testing Samples Round
          testing?.round ?? "",
          // 23 Testing Samples (fecha real)
          testing?.fecha_muestra ?? "",
          // 24 Shipping Samples Round
          shipping?.round ?? "",
          // 25 Shipping Samples
          shipping?.fecha_muestra ?? "",
          // 26 Trial Upper
          linea.trial_upper ?? "",
          // 27 Trial Lasting
          linea.trial_lasting ?? "",
          // 28 Lasting
          linea.lasting ?? "",
          // 29 Finish Date
          linea.finish_date ?? "",
          // 30 Inspection Round
          "",
          // 31 Inspection
          poItem.inspection ?? "",
          // 32 Booking
          poItem.booking ?? "",
          // 33 Closing
          poItem.closing ?? "",
          // 34 Shipping
          poItem.shipping_date ?? "",
          // 35 REMARKS (no se importa)
          ""
        ]);
      }
    }

    // 4) OCULTAR ID INTERNO (SCO)
    sheet.getColumn(1).hidden = true;

    // Anchos estándar
    sheet.columns.forEach((col) => {
      if (!col.width) col.width = 15;
    });

    // 5) PROTECCIÓN: solo desbloquear columnas editables
    const editableColumns = [
      15, 17, 19, 21, 23, 25, // muestras
      26, 27, 28, 29,         // trials + lastings
      31, 32, 33, 34,         // inspection, booking, closing, shipping
      35                      // remarks (solo visibles, no importados)
    ];

    const lastRow = sheet.rowCount;

    for (let rowNumber = firstDataRow; rowNumber <= lastRow; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      for (const colIdx of editableColumns) {
        row.getCell(colIdx).protection = { locked: false };
      }
    }

    await sheet.protect("5666", {
      selectLockedCells: true,
      selectUnlockedCells: true
    });

    // 6) DEVOLVER EXCEL
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="ProductionTracker-China.xlsx"'
      }
    });
  } catch (error: any) {
    console.error("Error export-china:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
