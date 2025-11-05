import Papa from "papaparse";

/** === 1️⃣ PARSEADOR PRINCIPAL (lee el CSV y devuelve un array de objetos) === */
export function parseCSVText(csvText: string) {
  if (!csvText || csvText.trim().length === 0) {
    console.error("❌ CSV vacío o no cargado correctamente");
    return [];
  }

  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => (h || "").trim(),
  });

  if (errors?.length) {
    console.warn("⚠️ Errores PapaParse:", errors);
  }

  return Array.isArray(data) ? data : [];
}

/** === 2️⃣ FUNCIONES AUXILIARES DE LIMPIEZA === */
function cleanStr(v: any) {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") return String(v);
  return v.trim();
}

function toNumber(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const normalized = String(v)
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3,})/g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export function parseDate(value: any): string | null {
  const v = cleanStr(value);
  if (!v) return null;

  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;

  let y = "", m = "", d = "";
  if (dmy.test(v)) {
    const [, dd, mm, yyyy] = v.match(dmy)!;
    y = yyyy;
    m = mm.padStart(2, "0");
    d = dd.padStart(2, "0");
  } else if (ymd.test(v)) {
    const [, yyyy, mm, dd] = v.match(ymd)!;
    y = yyyy;
    m = mm.padStart(2, "0");
    d = dd.padStart(2, "0");
  } else {
    return v; // devuelve texto original si no coincide formato fecha
  }

  return `${y}-${m}-${d}`;
}

/** === 3️⃣ MAPEO DE CAMPOS === */
type FieldAliases = Record<string, string[]>;

const MAP: FieldAliases = {
  po: ["PO"],
  customer: ["CUSTOMER"],
  factory: ["FACTORY"],
  supplier: ["SUPPLIER"],
  season: ["SEASON"],
  category: ["CATEGORY"],
  channel: ["CHANNEL"],
  pi: ["PI", "PI BSG"],
  po_date: ["PO DATE"],
  etd_pi: ["ETD PI"],
  booking: ["Booking"],
  closing: ["Closing"],
  shipping_date: ["Shipping Date", "Shipping"],

  reference: ["REFERENCE"],
  style: ["STYLE"],
  color: ["COLOR"],
  qty: ["QTY", "QUANTITY"],

  price: ["PRICE", "PRICE USD", "UNIT PRICE", "PVP", "PRECIO"],
  amount: ["AMOUNT", "TOTAL AMOUNT", "IMPORTE", "AMOUNT USD"],

  // === MUESTRAS ===
  cfm_date: ["CFMs"],
  counter_date: ["Counter Sample"],
  fitting_date: ["Fitting"],
  pps_date: ["PPS"],
  testing_date: ["Testing Samples"],
  shipping_sample_date: ["Shipping Samples"],
  inspection_date: ["Inspection"],
  trial_upper_date: ["Trial Upper"],
  trial_lasting_date: ["Trial Lasting"],
  lasting_date: ["Lasting"],
  finish_date: ["FINISH DATE"],

  // === ROUNDS ===
  cfm_round: ["CFMs Round"],
  counter_round: ["Counter Sample Round"],
  fitting_round: ["Fitting Round"],
  pps_round: ["PPS Round"],
  testing_round: ["Testing Samples Round"],
  shipping_sample_round: ["Shipping Samples Round"],
  inspection_round: ["Inspection Round"],

  // === STATUS ===
  cfm_status: ["CFMs Status"],
  counter_status: ["Counter Sample Status"],
  fitting_status: ["Fitting Status"],
  pps_status: ["PPS Status"],
  testing_status: ["Testing Samples Status"],
  shipping_sample_status: ["Shipping Samples Status"],
  trial_upper_status: ["Trial Upper Status"],
  trial_lasting_status: ["Trial Lasting Status"],
  lasting_status: ["Lasting Status"],
  finish_date_status: ["Finish Date Status"],
  inspection_status: ["Inspection Status"],
  shipping_status: ["Shipping Status"],
};

/** === 4️⃣ FUNCIONES INTERNAS === */
function get(row: any, aliases: string[]): any {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null && row[a] !== "") {
      return row[a];
    }
  }
  return undefined;
}

function neededFromStatus(s: any): boolean {
  const v = cleanStr(s).toUpperCase();
  return v === "N/N" || v === "NO NEED" ? false : true;
}

function sample(
  row: any,
  dateKey: keyof FieldAliases,
  roundKey?: keyof FieldAliases,
  statusKey?: keyof FieldAliases
): SampleStatus | undefined {
  const dateRaw = get(row, MAP[dateKey] || []);
  const hasAny =
    dateRaw !== undefined ||
    (roundKey && get(row, MAP[roundKey] || []) !== undefined) ||
    (statusKey && get(row, MAP[statusKey] || []) !== undefined);
  if (!hasAny) return undefined;

  const roundRaw = roundKey ? get(row, MAP[roundKey] || []) : undefined;
  const statusRaw = statusKey ? get(row, MAP[statusKey] || []) : undefined;

  return {
    needed: neededFromStatus(statusRaw),
    round: toNumber(roundRaw) ?? null,
    date: parseDate(dateRaw) ?? null,
  };
}

/** === 5️⃣ TIPOS === */
export interface SampleStatus {
  needed: boolean;
  round?: number | null;
  date?: string | null;
}

export interface LineData {
  style: string;
  color: string;
  reference: string;
  qty: number;
  price: number;
  amount?: number;

  cfm?: SampleStatus;
  counter_sample?: SampleStatus;
  fitting?: SampleStatus;
  pps?: SampleStatus;
  testing_sample?: SampleStatus;
  shipping_sample?: SampleStatus;
  inspection?: SampleStatus;

  trial_upper?: SampleStatus;
  trial_lasting?: SampleStatus;
  lasting?: SampleStatus;
  finish_date?: SampleStatus;
}

export interface POHeader {
  po?: string;
  supplier?: string;
  factory?: string;
  customer?: string;
  season?: string;
  category?: string;
  channel?: string;
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
  header?: POHeader;
  lines?: LineData[];
}

/** === 6️⃣ AGRUPADOR PRINCIPAL POR PO === */
export function groupRowsByPO(rows: any[]): POGroup[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const byPO = new Map<string, POGroup>();

  for (const row of rows) {
    const po = cleanStr(get(row, MAP.po) ?? "");
    if (!po) continue;

    // 🧩 Crear cabecera si no existe
    if (!byPO.has(po)) {
      const header: POHeader = {
        po,
        customer: cleanStr(get(row, MAP.customer) ?? ""),
        factory: cleanStr(get(row, MAP.factory) ?? ""),
        supplier: cleanStr(get(row, MAP.supplier) ?? ""),
        season: cleanStr(get(row, MAP.season) ?? ""),
        category: cleanStr(get(row, MAP.category) ?? ""),
        channel: cleanStr(get(row, MAP.channel) ?? ""),
        pi: cleanStr(get(row, MAP.pi) ?? ""),
        po_date: parseDate(get(row, MAP.po_date)),
        etd_pi: parseDate(get(row, MAP.etd_pi)),
        booking: parseDate(get(row, MAP.booking)),
        closing: parseDate(get(row, MAP.closing)),
        shipping_date: parseDate(get(row, MAP.shipping_date)),
        currency: "USD",
        estado_inspeccion: "-",
      };
      byPO.set(po, { header, lines: [] });
    }

    // 🧩 Agregar línea
    const grp = byPO.get(po)!;

    const line: LineData = {
      reference: cleanStr(get(row, MAP.reference) ?? ""),
      style: cleanStr(get(row, MAP.style) ?? ""),
      color: cleanStr(get(row, MAP.color) ?? ""),
      qty: toNumber(get(row, MAP.qty)) ?? 0,
      price: toNumber(get(row, MAP.price)) ?? 0,
      amount: toNumber(get(row, MAP.amount)) ?? undefined,

      cfm: sample(row, "cfm_date", "cfm_round", "cfm_status"),
      counter_sample: sample(row, "counter_date", "counter_round", "counter_status"),
      fitting: sample(row, "fitting_date", "fitting_round", "fitting_status"),
      pps: sample(row, "pps_date", "pps_round", "pps_status"),
      testing_sample: sample(row, "testing_date", "testing_round", "testing_status"),
      shipping_sample: sample(row, "shipping_sample_date", "shipping_sample_round", "shipping_sample_status"),
      inspection: sample(row, "inspection_date", "inspection_round", "inspection_status"),

      trial_upper: sample(row, "trial_upper_date", undefined, "trial_upper_status"),
      trial_lasting: sample(row, "trial_lasting_date", undefined, "trial_lasting_status"),
      lasting: sample(row, "lasting_date", undefined, "lasting_status"),
      finish_date: sample(row, "finish_date", undefined, "finish_date_status"),
    };

    grp.lines!.push(line);
  }

  return Array.from(byPO.values());
}
