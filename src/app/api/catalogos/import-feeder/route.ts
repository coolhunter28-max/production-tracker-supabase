// src/app/api/catalogos/import-feeder/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function cellText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";

  // ExcelJS: { richText: [{text:"..."}] } o { text:"..." }
  if (typeof v === "object") {
    if ("text" in v && (v as any).text) return String((v as any).text).trim();
    if ("richText" in v && Array.isArray((v as any).richText)) {
      return (v as any).richText.map((r: any) => r.text).join("").trim();
    }
    // Fórmulas: { formula, result }
    if ("result" in v && (v as any).result != null) return String((v as any).result).trim();
  }
  return String(v).trim();
}

function normalizeName(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

// Convierte encabezado a "category" estable y legible
function slugCategory(s: string) {
  return normalizeName(s)
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isHeaderHit(s: string) {
  const t = normalizeName(s).toUpperCase();
  // Palabras típicas de tu feeder
  return (
    t === "MATERIAL" ||
    t === "INSOLE TYPE" ||
    t === "OUTSOLE" ||
    t === "LEATHER" ||
    t === "SYNTHETIC" ||
    t === "FABRIC" ||
    t === "RECYCLED" ||
    t === "SHOELACE" ||
    t === "ISSUE" ||
    t === "TYPE" ||
    t === "LAST NO." ||
    t === "LAST NAME" ||
    t === "OUTSOLE NO." ||
    t === "OUTSOLE NAME"
  );
}

// Busca la fila de encabezados (top headers) dentro de las primeras 40 filas
function findHeaderRow(sheet: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(sheet.rowCount, 40); r++) {
    const row = sheet.getRow(r);
    let hits = 0;
    for (let c = 1; c <= Math.min(sheet.columnCount, 80); c++) {
      const txt = cellText(row.getCell(c).value);
      if (txt && isHeaderHit(txt)) hits++;
    }
    if (hits >= 3) return r; // con 3 coincidencias ya suele ser la fila buena
  }
  return null;
}

type CatalogRow = {
  category: string;
  code: string | null;
  name: string;
  extra: any;
  active: boolean;
};

function pushUnique(
  map: Map<string, CatalogRow>,
  category: string,
  nameRaw: string,
  code?: string | null,
  extra?: any
) {
  const name = normalizeName(nameRaw);
  if (!name) return;

  const cat = slugCategory(category);
  if (!cat) return;

  const key = `${cat}::${name.toLowerCase()}`;
  if (map.has(key)) return;

  map.set(key, {
    category: cat,
    code: code ? normalizeName(code) : null,
    name,
    extra: extra ?? null,
    active: true,
  });
}

// -------------------------------------------------------------
// POST: subes el feeder excel y lo mete en public.catalogos
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    // 1) Elegir hoja: preferimos una que contenga "feeder" o si no, la primera
    const sheet =
      wb.worksheets.find((s) => (s.name || "").toLowerCase().includes("feeder")) ||
      wb.worksheets[0];

    if (!sheet) {
      return NextResponse.json({ error: "No worksheet found" }, { status: 400 });
    }

    // 2) Detectar fila de headers
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) {
      return NextResponse.json(
        { error: `No pude detectar la fila de encabezados en la hoja "${sheet.name}".` },
        { status: 400 }
      );
    }

    const topHeader = sheet.getRow(headerRow);
    const subHeader = sheet.getRow(headerRow + 1);
    const dataStart = headerRow + 2;

    // 3) Construir definición de columnas
    //    Si hay cabecera "Issue" + subcabecera "Style/SKUs" => category = "Issue_Style", etc.
    const columns: { col: number; category: string }[] = [];

    for (let c = 1; c <= sheet.columnCount; c++) {
      const top = cellText(topHeader.getCell(c).value);
      const sub = cellText(subHeader.getCell(c).value);

      if (!top && !sub) continue;

      // Hay zonas con cabeceras fusionadas: top="Issue" y sub="Style"
      // Si top existe y sub también, combinamos.
      let category = "";
      if (top && sub && top.toLowerCase() !== sub.toLowerCase()) {
        category = `${top} ${sub}`;
      } else {
        category = top || sub;
      }

      category = normalizeName(category);
      if (!category) continue;

      columns.push({ col: c, category });
    }

    if (columns.length === 0) {
      return NextResponse.json(
        { error: `No encontré columnas útiles en la hoja "${sheet.name}".` },
        { status: 400 }
      );
    }

    // 4) Leer valores bajo cada columna, hasta el final.
    //    Guardamos en un map para evitar duplicados.
    const items = new Map<string, CatalogRow>();

    // límite razonable (evita recorrer 20000 filas si hay ruido)
    const maxRow = Math.min(sheet.rowCount, dataStart + 5000);

    for (let r = dataStart; r <= maxRow; r++) {
      const row = sheet.getRow(r);

      for (const def of columns) {
        const raw = cellText(row.getCell(def.col).value);
        if (!raw) continue;

        // En tu feeder hay celdas tipo "DIC-8941" o "BSG_...". Para esas columnas,
        // dejamos code vacío y name como el texto tal cual.
        // Si más adelante quieres separar code/name, lo refinamos.
        pushUnique(items, def.category, raw, null, null);
      }
    }

    const payload = Array.from(items.values());

    if (payload.length === 0) {
      return NextResponse.json({
        status: "ok",
        sheet: sheet.name,
        header_row: headerRow,
        inserted: 0,
        message: "No se encontraron valores para importar.",
      });
    }

    // 5) Insertar en batches (respetando unique index category+name)
    //    Si hay duplicados por ejecución repetida, fallaría. Por eso usamos upsert.
    const BATCH = 500;
    let upserted = 0;

    for (let i = 0; i < payload.length; i += BATCH) {
      const chunk = payload.slice(i, i + BATCH);

      const { error } = await supabase
        .from("catalogos")
        .upsert(chunk, {
          onConflict: "category,name",
          ignoreDuplicates: true, // si ya existe, no lo toca
        });

      if (error) {
        return NextResponse.json(
          { error: `Error insertando catalogos: ${error.message}` },
          { status: 500 }
        );
      }

      upserted += chunk.length;
    }

    return NextResponse.json({
      status: "ok",
      sheet: sheet.name,
      header_row: headerRow,
      imported_unique: payload.length,
      processed_for_upsert: upserted,
    });
  } catch (error: any) {
    console.error("Error import-feeder:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
