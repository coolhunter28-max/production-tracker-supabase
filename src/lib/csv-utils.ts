import Papa from "papaparse";

/** 1) Parseo CSV base (detecta delimitador coma o punto y coma) */
export function parseCSVText(csvText: string) {
  const firstLine = csvText.split("\n")[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const { data, errors, meta } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (h) => (h || "").trim(),
  });
  if (errors?.length) console.warn("⚠️ Errores PapaParse:", errors);
  console.log(`🧩 Delimitador detectado: "${meta?.delimiter}"`);
  return Array.isArray(data) ? data : [];
}

/** Helpers de normalización */
function cleanStr(v: any) {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") return String(v);
  return v.trim();
}

/** Parseo robusto de dinero */
function parseMoney(v: any): number {
  const s0 = cleanStr(v);
  if (!s0) return 0;
  const s = s0.replace(/[^0-9.,-]/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1);
    return Number(`${intPart}.${decPart}`) || 0;
  }
  if (hasComma) {
    const parts = s.split(",");
    const last = parts[parts.length - 1];
    if (last.length === 2)
      return Number(`${parts.slice(0, -1).join("")}.${last}`) || 0;
    return Number(parts.join("")) || 0;
  }
  if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (last.length === 2)
      return Number(`${parts.slice(0, -1).join("")}.${last}`) || 0;
    return Number(parts.join("")) || 0;
  }
  return Number(s) || 0;
}

/** Parseo cantidad entera */
function parseQty(v: any): number {
  const s = cleanStr(v).replace(/[^\d-]/g, "");
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

/* ============================
   FECHAS INTELIGENTES
   ============================ */

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  ene: 1,
  enero: 1,
  feb: 2,
  february: 2,
  febrero: 2,
  mar: 3,
  march: 3,
  marzo: 3,
  apr: 4,
  april: 4,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  june: 6,
  junio: 6,
  jul: 7,
  july: 7,
  julio: 7,
  aug: 8,
  august: 8,
  ago: 8,
  agosto: 8,
  sep: 9,
  sept: 9,
  september: 9,
  septiembre: 9,
  oct: 10,
  october: 10,
  octubre: 10,
  nov: 11,
  november: 11,
  noviembre: 11,
  dec: 12,
  december: 12,
  dic: 12,
  diciembre: 12,
};

function pad2(n: number | string) {
  const s = String(n);
  return s.length === 1 ? `0${s}` : s;
}

/** Devuelve YYYY-MM-DD o null, con fallbackYear si falta */
function parseDateSmart(value: any, fallbackYear?: number | null): string | null {
  const v = cleanStr(value);
  if (!v) return null;

  // yyyy-mm-dd o yyyy/mm/dd
  let m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

  // dd-mm-yyyy o dd/mm/yyyy
  m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

  // dd-mmm(-yy)?
  m = v.match(/^(\d{1,2})[\/\-]\s*([A-Za-z]{3,})\s*(?:[\/\-](\d{2,4}))?$/);
  if (m) {
    const dd = Number(m[1]);
    const mon = MONTHS[m[2].toLowerCase()];
    let year: number | null = null;
    if (m[3]) {
      const y = Number(m[3]);
      year = y < 100 ? 2000 + y : y;
    } else {
      year = fallbackYear ?? null;
    }
    if (!mon || !year) return null;
    return `${year}-${pad2(mon)}-${pad2(dd)}`;
  }

  // dd/mm o dd-mm (sin año)
  m = v.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const year = fallbackYear ?? null;
    if (!year) return null;
    return `${year}-${pad2(mm)}-${pad2(dd)}`;
  }

  return null;
}

/** Fechas directamente parseadas (cuando ya traen año) */
export function parseDate(value: any): string | null {
  return parseDateSmart(value, null);
}

/** Alias flexibles de cabeceras */
type FieldAliases = Record<string, string[]>;

const MAP: FieldAliases = {
  po: ["PO"],
  customer: ["CUSTOMER"],
  factory: ["FACTORY"],
  supplier: ["SUPPLIER"],
  season: ["SEASON"],
  category: ["CATEGORY"],
  channel: ["CHANNEL"],
  size_run: ["SIZE RUN", "SIZE", "SIZERUN"],
  pi: ["PI"],

  po_date: ["PO DATE"],
  etd_pi: ["ETD PI"],
  booking: ["Booking"],
  closing: ["Closing"],
  shipping_date: ["Shipping Date", "Shipping"],

  reference: ["REFERENCE"],
  style: ["STYLE"],
  color: ["COLOR"],
  qty: ["QTY", "QUANTITY"],
  price: ["PRICE", "PRICE USD", "UNIT PRICE"],
  amount: ["AMOUNT", "TOTAL AMOUNT", "IMPORTE"],

  // ===== Muestras: ROUND + FECHA =====
  cfm_round: ["CFMs Round", "CFM Round"],
  cfm_date: ["CFMs", "CFM"],

  counter_round: ["Counter Sample Round"],
  counter_date: ["Counter Sample"],

  fitting_round: ["Fitting Round"],
  fitting_date: ["Fitting"],

  pps_round: ["PPS Round"],
  pps_date: ["PPS"],

  testing_round: ["Testing Samples Round"],
  testing_date: ["Testing Samples", "Testing"],

  shipping_round: ["Shipping Samples Round"],
  shipping_sample_date: ["Shipping Samples", "Shipping Sample"],

  // Procesos producción
  trial_upper_date: ["Trial Upper"],
  trial_lasting_date: ["Trial Lasting"],
  lasting_date: ["Lasting"],
  finish_date: ["FINISH DATE", "Finish"],
};

function get(row: any, aliases: string[]): any {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null && row[a] !== "") return row[a];
  }
  return undefined;
}

/** Intenta deducir el año del propio registro */
function inferYearFromRow(row: any): number | null {
  const candidates = [
    get(row, MAP.etd_pi),
    get(row, MAP.shipping_date),
    get(row, MAP.booking),
    get(row, MAP.closing),
    get(row, MAP.po_date),
  ];
  for (const c of candidates) {
    const p = parseDateSmart(c, null);
    if (p) return Number(p.slice(0, 4));
  }
  return null;
}

/** Estructuras tipadas */
export interface POLine {
  reference: string;
  style: string;
  color: string;
  size_run?: string;
  category?: string;
  channel?: string;
  qty: number;
  price: number;
  amount?: number;

  // Fechas de muestra
  cfm?: string | null;
  counter_sample?: string | null;
  fitting?: string | null;
  pps?: string | null;
  testing_sample?: string | null;
  shipping_sample?: string | null;

  // Round original del Excel (Round 1, N/N, etc.)
  cfm_round?: string | null;
  counter_round?: string | null;
  fitting_round?: string | null;
  pps_round?: string | null;
  testing_round?: string | null;
  shipping_round?: string | null;

  // Procesos
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;
}

export interface POHeader {
  po?: string;
  supplier?: string;
  factory?: string;
  customer?: string;
  season?: string;
  category?: string;
  channel?: string;
  size_run?: string;
  po_date?: string | null;
  etd_pi?: string | null;
  booking?: string | null;
  closing?: string | null;
  shipping_date?: string | null;
  currency?: string;
  pi?: string;
  estado_inspeccion?: string;
}

export interface POGroup {
  header: POHeader;
  lines: POLine[];
}

/** Agrupar por PO (con fechas inteligentes + info de muestras) */
export function groupRowsByPO(rows: any[]): POGroup[] {
  const byPO = new Map<string, POGroup>();

  for (const row of rows) {
    const po = cleanStr(get(row, MAP.po) ?? "");
    if (!po) continue;

    if (!byPO.has(po)) {
      const headerYear = inferYearFromRow(row);
      const header: POHeader = {
        po,
        customer: cleanStr(get(row, MAP.customer) ?? ""),
        factory: cleanStr(get(row, MAP.factory) ?? ""),
        supplier: cleanStr(get(row, MAP.supplier) ?? ""),
        season: cleanStr(get(row, MAP.season) ?? ""),
        category: cleanStr(get(row, MAP.category) ?? ""),
        channel: cleanStr(get(row, MAP.channel) ?? ""),
        size_run: cleanStr(get(row, MAP.size_run) ?? ""),
        pi: cleanStr(get(row, MAP.pi) ?? ""),
        po_date: parseDateSmart(get(row, MAP.po_date), headerYear),
        etd_pi: parseDateSmart(get(row, MAP.etd_pi), headerYear),
        booking: parseDateSmart(get(row, MAP.booking), headerYear),
        closing: parseDateSmart(get(row, MAP.closing), headerYear),
        shipping_date: parseDateSmart(get(row, MAP.shipping_date), headerYear),
        currency: "USD",
        estado_inspeccion: "-",
      };
      byPO.set(po, { header, lines: [] });
    }

    const grp = byPO.get(po)!;
    const fallbackYear = inferYearFromRow(row);

    const qty = parseQty(get(row, MAP.qty));
    const price = parseMoney(get(row, MAP.price));
    const amount = parseMoney(get(row, MAP.amount)) || qty * price;

    const line: POLine = {
      reference: cleanStr(get(row, MAP.reference) ?? ""),
      style: cleanStr(get(row, MAP.style) ?? ""),
      color: cleanStr(get(row, MAP.color) ?? ""),
      size_run: cleanStr(get(row, MAP.size_run) ?? ""),
      category: cleanStr(get(row, MAP.category) ?? ""),
      channel: cleanStr(get(row, MAP.channel) ?? ""),
      qty,
      price,
      amount,

      // Muestras: fecha + round original
      cfm: parseDateSmart(get(row, MAP.cfm_date), fallbackYear),
      cfm_round: cleanStr(get(row, MAP.cfm_round) ?? "") || null,

      counter_sample: parseDateSmart(get(row, MAP.counter_date), fallbackYear),
      counter_round: cleanStr(get(row, MAP.counter_round) ?? "") || null,

      fitting: parseDateSmart(get(row, MAP.fitting_date), fallbackYear),
      fitting_round: cleanStr(get(row, MAP.fitting_round) ?? "") || null,

      pps: parseDateSmart(get(row, MAP.pps_date), fallbackYear),
      pps_round: cleanStr(get(row, MAP.pps_round) ?? "") || null,

      testing_sample: parseDateSmart(get(row, MAP.testing_date), fallbackYear),
      testing_round: cleanStr(get(row, MAP.testing_round) ?? "") || null,

      shipping_sample: parseDateSmart(
        get(row, MAP.shipping_sample_date),
        fallbackYear
      ),
      shipping_round: cleanStr(get(row, MAP.shipping_round) ?? "") || null,

      // Procesos producción
      trial_upper: parseDateSmart(get(row, MAP.trial_upper_date), fallbackYear),
      trial_lasting: parseDateSmart(
        get(row, MAP.trial_lasting_date),
        fallbackYear
      ),
      lasting: parseDateSmart(get(row, MAP.lasting_date), fallbackYear),
      finish_date: parseDateSmart(get(row, MAP.finish_date), fallbackYear),
    };

    grp.lines.push(line);
  }

  return Array.from(byPO.values());
}

/* ==== Compat helpers ==== */
export function parseMoneyES(v: any): number | null {
  return parseMoney(v) || null;
}
export function parseIntES(v: any): number | null {
  if (v == null || v === "") return null;
  const s = String(v).replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
