export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

import { getCurrentUserAccess } from "@/lib/ownership";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cleanPart(value: unknown) {
  return String(value ?? "").trim();
}

function buildLegacySco(parts: {
  supplier?: string | null;
  season?: string | null;
  customer?: string | null;
  po?: string | null;
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  size?: string | null;
  
}) {
  return [
    parts.supplier,
    parts.season,
    parts.customer,
    parts.po,
    parts.reference,
    parts.style,
    parts.color,
    parts.size,
     ]
    .map(cleanPart)
    .join("");
}

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

    const seasons = seasonsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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
          category,
          channel,
          qty,
          price,
          amount,
          factory,
          booking,
          closing,
          shipping_date,
          inspection,
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
    const infoRow = sheet.addRow(["", "", "Production Tracker", "", "", exportDate]);

    infoRow.getCell(3).font = { bold: true, color: { argb: "FF008B8B" } };
    infoRow.getCell(6).numFmt = "dd-mmm-yy";

    sheet.addRow([]);

    const HEADERS = [
      "SCO",
      "SCO Legacy",
      "SUPPLIER",
      "SEASON",
      "CUSTOMER",
      "FACTORY",
      "PO",
      "REFERENCE",
      "STYLE",
      "COLOR",
      "SIZE RUN",
      "CATEGORY",
      "CHANNEL",
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

        const lineFactory = linea.factory ?? poItem.factory ?? "";
        const legacySco = buildLegacySco({
          supplier: poItem.supplier,
          season: poItem.season,
          customer: poItem.customer,
          po: poItem.po,
          reference: linea.reference,
          style: linea.style,
          color: linea.color,
          size: linea.size_run,
         
        });

        sheet.addRow([
          linea.id ?? "",
          legacySco,
          poItem.supplier ?? "",
          poItem.season ?? "",
          poItem.customer ?? "",
          lineFactory,
          poItem.po ?? "",
          linea.reference ?? "",
          linea.style ?? "",
          linea.color ?? "",
          linea.size_run ?? "",
          linea.category ?? "",
          linea.channel ?? "",
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
          linea.inspection ?? poItem.inspection ?? "",
          linea.booking ?? poItem.booking ?? "",
          linea.closing ?? poItem.closing ?? "",
          linea.shipping_date ?? poItem.shipping_date ?? "",
          "",
        ]);
      }
    }

    // Columna A = UUID real de lineas_pedido. Se oculta, pero sigue siendo la clave segura de importación.
    sheet.getColumn(1).hidden = true;

    sheet.columns.forEach((col) => {
      if (!col.width) col.width = 15;
    });

    sheet.getColumn(2).width = 45; // SCO Legacy visible para casar con Excel histórico.

    const editableHeaderNames = new Set([
      "CFMs",
      "Counter Sample",
      "Fitting",
      "PPS",
      "Testing Samples",
      "Shipping Samples",
      "Trial Upper",
      "Trial Lasting",
      "Lasting",
      "Finish Date",
      "Inspection",
      "Booking",
      "Closing",
      "Shipping",
      "REMARKS",
    ]);

    const editableColumns = HEADERS
      .map((header, index) => (editableHeaderNames.has(header) ? index + 1 : null))
      .filter((value): value is number => value !== null);

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
