export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

import { getCurrentUserAccess } from "@/lib/ownership";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const access = await getCurrentUserAccess();

    const canExportChina =
      access.isActive &&
      (access.role === "ADMIN" || access.role === "MANAGER");

    if (!canExportChina) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const seasonsRaw = searchParams.get("seasons");
    if (!seasonsRaw) {
      return NextResponse.json(
        { error: "Seasons parameter is required" },
        { status: 400 }
      );
    }

    const seasons = seasonsRaw.split(",").map((s) => s.trim());

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("China");

    const exportDate = new Date();
    const infoRow = sheet.addRow(["", "Production Tracker", "", "", exportDate]);

    infoRow.getCell(2).font = { bold: true, color: { argb: "FF008B8B" } };
    infoRow.getCell(5).numFmt = "dd-mmm-yy";

    sheet.addRow([]);

    const HEADERS = [
      "SCO",
      "SUPPLIER",
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
      "REMARKS",
    ];

    const headerRow = sheet.addRow(HEADERS);
    headerRow.font = { bold: true };

    const firstDataRow = headerRow.number + 1;

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
          linea.id ?? "",
          poItem.supplier ?? "",
          poItem.season ?? "",
          poItem.customer ?? "",
          poItem.factory ?? "",
          poItem.po ?? "",
          linea.reference ?? "",
          linea.style ?? "",
          linea.color ?? "",
          linea.size_run ?? "",
          linea.qty ?? "",
          poItem.po_date ?? "",
          poItem.etd_pi ?? "",
          cfm?.round ?? "",
          cfm?.fecha_muestra ?? "",
          counter?.round ?? "",
          counter?.fecha_muestra ?? "",
          fitting?.round ?? "",
          fitting?.fecha_muestra ?? "",
          pps?.round ?? "",
          pps?.fecha_muestra ?? "",
          testing?.round ?? "",
          testing?.fecha_muestra ?? "",
          shipping?.round ?? "",
          shipping?.fecha_muestra ?? "",
          linea.trial_upper ?? "",
          linea.trial_lasting ?? "",
          linea.lasting ?? "",
          linea.finish_date ?? "",
          "",
          poItem.inspection ?? "",
          poItem.booking ?? "",
          poItem.closing ?? "",
          poItem.shipping_date ?? "",
          "",
        ]);
      }
    }

    sheet.getColumn(1).hidden = true;

    sheet.columns.forEach((col) => {
      if (!col.width) col.width = 15;
    });

    const editableColumns = [
      15, 17, 19, 21, 23, 25,
      26, 27, 28, 29,
      31, 32, 33, 34,
      35,
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
      selectUnlockedCells: true,
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="ProductionTracker-China.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("Error export-china:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}