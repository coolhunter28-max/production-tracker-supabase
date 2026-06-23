import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

console.log("🚀 /api/compare-csv iniciado...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ============================================================
   Helpers
   ============================================================ */

type Diff = {
  campo: string;
  old: any;
  new: any;
  kind?:
    | "header"
    | "line"
    | "sample"
    | "new_line"
    | "cancel_line"
    | "new_po"
    | "cancel_po";
};

const DATE_FIELDS = new Set([
  "po_date",
  "etd_pi",
  "booking",
  "closing",
  "shipping_date",
  "trial_upper",
  "trial_lasting",
  "lasting",
  "finish_date",
]);

const QTY_FIELDS = new Set(["qty"]);
const MONEY_FIELDS = new Set(["price", "amount"]);

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Import Spain:
 * - qty usa punto como separador de miles: 2.800 -> 2800
 * - price/amount usan coma decimal: 14,20 -> 14.20 / 3.383,10 -> 3383.10
 * - BD puede devolver formato normalizado: 14.20 / 3383.10
 */
function parseQty(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");

  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMoney(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
  }

  let raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/€/g, "");

  if (!raw) return null;

  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : null;
}

function normalizeDate(value: any): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "object" && value.date) {
    return normalizeDate(value.date);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const euroMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (euroMatch) {
    const dd = euroMatch[1].padStart(2, "0");
    const mm = euroMatch[2].padStart(2, "0");
    const yyyy = euroMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function changedText(current: any, incoming: any) {
  return normalizeValue(current) !== normalizeValue(incoming);
}

function changedQty(current: any, incoming: any) {
  const a = parseQty(current);
  const b = parseQty(incoming);

  if (a === null && b === null) return false;
  if (a === null || b === null) return true;

  return Math.abs(a - b) > 0.0001;
}

function changedMoney(current: any, incoming: any) {
  const a = parseMoney(current);
  const b = parseMoney(incoming);

  if (a === null && b === null) return false;
  if (a === null || b === null) return true;

  return Math.abs(a - b) > 0.0001;
}

function changedDate(current: any, incoming: any) {
  return normalizeDate(current) !== normalizeDate(incoming);
}

function hasChangedField(field: string, current: any, incoming: any) {
  if (QTY_FIELDS.has(field)) return changedQty(current, incoming);
  if (MONEY_FIELDS.has(field)) return changedMoney(current, incoming);
  if (DATE_FIELDS.has(field)) return changedDate(current, incoming);
  return changedText(current, incoming);
}

function displayOldNew(field: string, oldValue: any, newValue: any) {
  if (QTY_FIELDS.has(field)) {
    return {
      old: parseQty(oldValue) ?? "-",
      new: parseQty(newValue) ?? "-",
    };
  }

  if (MONEY_FIELDS.has(field)) {
    return {
      old: parseMoney(oldValue) ?? "-",
      new: parseMoney(newValue) ?? "-",
    };
  }

  if (DATE_FIELDS.has(field)) {
    return {
      old: normalizeDate(oldValue) || "-",
      new: normalizeDate(newValue) || "-",
    };
  }

  return {
    old: normalizeValue(oldValue) || "-",
    new: normalizeValue(newValue) || "-",
  };
}

function extractCSVDate(csvField: any): string | null {
  const normalized = normalizeDate(csvField);
  return normalized || null;
}

function normalizeKeyPart(value: any): string {
  return normalizeValue(value).toUpperCase();
}

function lineKey(line: any): string {
  return [
    normalizeKeyPart(line.reference),
    normalizeKeyPart(line.style),
    normalizeKeyPart(line.color),
    normalizeKeyPart(line.size_run),
    normalizeKeyPart(line.channel),
    normalizeKeyPart(line.category),
    String(parseQty(line.qty) ?? ""),
  ].join("||");
}

function lineLabel(line: any): string {
  return [
    normalizeValue(line.reference) || "-",
    normalizeValue(line.style) || "-",
    normalizeValue(line.color) || "-",
    normalizeValue(line.size_run) || "-",
  ].join(" / ");
}

function matchesSampleType(dbTipo: string | null | undefined, key: string): boolean {
  if (!dbTipo) return false;
  const t = dbTipo.toLowerCase();

  switch (key) {
    case "cfm":
      return t.includes("cfm");
    case "counter_sample":
      return t.includes("counter");
    case "fitting":
      return t.includes("fitting");
    case "pps":
      return t.includes("pps");
    case "testing_sample":
      return t.includes("testing");
    case "shipping_sample":
      return t.includes("shipping");
    default:
      return false;
  }
}

function compareSamples(dbSamples: any[], csvLine: any, label: string): Diff[] {
  const diffs: Diff[] = [];
  const tipos = [
    "cfm",
    "counter_sample",
    "fitting",
    "pps",
    "testing_sample",
    "shipping_sample",
  ];

  for (const tipo of tipos) {
    const db = dbSamples.find((s) => matchesSampleType(s.tipo_muestra, tipo));

    const dbDate = db?.fecha_muestra || null;
    const csvDate = extractCSVDate(csvLine[tipo]);

    if (changedDate(dbDate, csvDate)) {
      diffs.push({
        campo: `${label} → ${tipo.toUpperCase()}`,
        old: normalizeDate(dbDate) || "-",
        new: normalizeDate(csvDate) || "-",
        kind: "sample",
      });
    }
  }

  return diffs;
}

function buildNewPoDiff(header: any, lines: any[]): Diff[] {
  return [
    {
      campo: "PO",
      old: "-",
      new: `Nuevo PO (${lines.length} líneas)`,
      kind: "new_po",
    },
    ...lines.slice(0, 20).map((line) => ({
      campo: `Línea nueva: ${lineLabel(line)}`,
      old: "-",
      new: "Nueva línea",
      kind: "new_line" as const,
    })),
    ...(lines.length > 20
      ? [
          {
            campo: "Líneas nuevas",
            old: "-",
            new: `+${lines.length - 20} líneas adicionales`,
            kind: "new_line" as const,
          },
        ]
      : []),
  ];
}

/* ============================================================
   Handler principal
   ============================================================ */

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    if (!groupedPOs || !Array.isArray(groupedPOs)) {
      throw new Error("Datos de pedidos no válidos.");
    }

    console.log(`🧾 Comparando archivo ${fileName} (${groupedPOs.length} POs)...`);

    const incomingPOs = groupedPOs
      .map((poGroup: any) => poGroup.header?.po)
      .filter(Boolean);

    const incomingPOSet = new Set(incomingPOs);

    const incomingSeasons = [
      ...new Set(
        groupedPOs
          .map((poGroup: any) => poGroup.header?.season)
          .filter(Boolean)
      ),
    ];

    const { data: dbPOs, error: dbError } = await supabase
      .from("pos")
      .select(`
        id,
        po,
        supplier,
        factory,
        customer,
        season,
        po_date,
        etd_pi,
        booking,
        closing,
        shipping_date,
        currency,
        estado_inspeccion,
        pi,
        estado,
        lineas_pedido (
          id,
          reference,
          style,
          color,
          size_run,
          qty,
          price,
          amount,
          category,
          channel,
          trial_upper,
          trial_lasting,
          lasting,
          finish_date,
          estado,
          muestras (
            tipo_muestra,
            fecha_muestra
          )
        )
      `)
      .in("season", incomingSeasons.length > 0 ? incomingSeasons : ["__NO_SEASON__"]);

    if (dbError) {
      throw new Error(`Error en Supabase: ${dbError.message}`);
    }

    const dbMap = new Map((dbPOs ?? []).map((p: any) => [p.po, p]));

    let nuevos = 0;
    let modificados = 0;
    let sinCambios = 0;
    let cancelados = 0;

    const detalles: Record<string, any> = {};

    for (const poGroup of groupedPOs) {
      const header = poGroup.header;
      const lines = poGroup.lines || [];
      const dbPO = dbMap.get(header.po);

      if (!dbPO) {
        nuevos++;
        detalles[header.po] = {
          status: "nuevo",
          cambios: buildNewPoDiff(header, lines),
        };
        continue;
      }

      const cambios: Diff[] = [];

      const camposHeader = [
        "supplier",
        "factory",
        "customer",
        "season",
        "po_date",
        "etd_pi",
        "booking",
        "closing",
        "shipping_date",
        "currency",
        "estado_inspeccion",
        "pi",
      ];

      for (const campo of camposHeader) {
        if (hasChangedField(campo, dbPO[campo], header[campo])) {
          const diffValues = displayOldNew(campo, dbPO[campo], header[campo]);

          cambios.push({
            campo,
            old: diffValues.old,
            new: diffValues.new,
            kind: "header",
          });
        }
      }

      if (dbPO.estado === "CANCELADO") {
        cambios.push({
          campo: "PO estado",
          old: "CANCELADO",
          new: "ACTIVO",
          kind: "header",
        });
      }

      const dbLines = (dbPO.lineas_pedido ?? []).filter(
        (line: any) => line.estado === "ACTIVA"
      );
      const dbLinesByKey = new Map<string, any[]>();

      for (const dbLine of dbLines) {
        const key = lineKey(dbLine);
        const existing = dbLinesByKey.get(key) ?? [];
        existing.push(dbLine);
        dbLinesByKey.set(key, existing);
      }

      const incomingLineKeys = new Set<string>();

      for (const line of lines) {
        const key = lineKey(line);
        incomingLineKeys.add(key);

        const candidates = dbLinesByKey.get(key) ?? [];

        if (candidates.length === 0) {
          cambios.push({
            campo: `Línea nueva: ${lineLabel(line)}`,
            old: "-",
            new: "Nueva línea",
            kind: "new_line",
          });
          continue;
        }

        if (candidates.length > 1) {
          cambios.push({
            campo: `Línea ambigua: ${lineLabel(line)}`,
            old: `${candidates.length} líneas coinciden en BD`,
            new: "Revisar manualmente antes de importar",
            kind: "line",
          });
          continue;
        }

        const dbLine = candidates[0];
        const label = lineLabel(line);

        if (dbLine.estado === "CANCELADA") {
          cambios.push({
            campo: `${label} → estado`,
            old: "CANCELADA",
            new: "ACTIVA",
            kind: "line",
          });
        }

        const camposLinea = [
          "qty",
          "price",
          "amount",
          "category",
          "channel",
          "trial_upper",
          "trial_lasting",
          "lasting",
          "finish_date",
        ];

        for (const campo of camposLinea) {
          if (hasChangedField(campo, dbLine[campo], line[campo])) {
            const diffValues = displayOldNew(campo, dbLine[campo], line[campo]);

            cambios.push({
              campo: `${label} → ${campo}`,
              old: diffValues.old,
              new: diffValues.new,
              kind: "line",
            });
          }
        }

        const sampleDiffs = compareSamples(dbLine.muestras || [], line, label);
        cambios.push(...sampleDiffs);
      }

      for (const dbLine of dbLines) {
        if (dbLine.estado === "CANCELADA") continue;

        const key = lineKey(dbLine);

        if (!incomingLineKeys.has(key)) {
          cambios.push({
            campo: `Línea cancelada: ${lineLabel(dbLine)}`,
            old: "ACTIVA",
            new: "CANCELADA si se confirma importación",
            kind: "cancel_line",
          });
        }
      }

      if (cambios.length > 0) {
        modificados++;
        detalles[header.po] = { status: "modificado", cambios };
      } else {
        sinCambios++;
        detalles[header.po] = { status: "sin_cambios", cambios: [] };
      }
    }

    for (const dbPO of dbPOs ?? []) {
      if (dbPO.estado === "CANCELADO") continue;

      if (!incomingPOSet.has(dbPO.po)) {
        cancelados++;
        detalles[dbPO.po] = {
          status: "cancelado",
          cambios: [
            {
              campo: "PO cancelado",
              old: "ACTIVO",
              new: "CANCELADO si se confirma importación",
              kind: "cancel_po",
            },
          ],
        };
      }
    }

    const resumen = {
      nuevos,
      modificados,
      sinCambios,
      cancelados,
      detalles,
    };

    console.log(
      `📊 Resultado comparación: ${nuevos} nuevos, ${modificados} modificados, ${cancelados} cancelados, ${sinCambios} sin cambios`
    );

    return NextResponse.json(resumen);
  } catch (err: any) {
    console.error("❌ Error en /api/compare-csv:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
