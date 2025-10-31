import Papa from "papaparse";

// ---------------- utilidades de normalización ----------------

const cleanKey = (k: string) =>
  k ? String(k).trim().toLowerCase().replace(/\s+|[_\-\.]/g, "") : "";

function getAny(row: Record<string, any>, labels: string[]) {
  const keys = Object.keys(row);
  for (const label of labels) {
    const found = keys.find((k) => cleanKey(k) === cleanKey(label));
    if (found) return row[found];
  }
  return "";
}

// ---- formato europeo ----

/** Cantidades enteras (e.g. "2.000" -> 2000) */
const parseQtyEU = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const onlyDigits = String(val).replace(/[^\d]/g, "");
  if (!onlyDigits) return 0;
  return parseInt(onlyDigits, 10) || 0;
};

/** Dinero con coma decimal y símbolos (e.g. "$18,45" -> 18.45; "$36.900,00" -> 36900) */
const parseMoneyEU = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val)
    .replace(/[^\d,.\-]/g, "") // deja dígitos, coma, punto, signo
    .replace(/\./g, "")        // quita miles
    .replace(",", ".");        // coma -> punto
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export const parseDate = (val: any): string | null => {
  if (!val) return null;
  const s = String(val).trim();
  // dd/mm/yyyy | dd-mm-yyyy | dd.mm.yyyy | yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  let [_, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) >= 70 ? "19" : "20") + y;
  const yyyy = y.padStart(4, "0");
  const mm = mo.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---------------- lógica de muestras ----------------

/** Normaliza usando columnas "Round" (N/N | Round X) + "Fecha" (columna del tipo sin "Status") */
function normalizeFromRoundAndDate(roundVal: any, dateVal: any) {
  const roundTxt = String(roundVal || "").trim();
  const date = parseDate(dateVal);

  if (roundTxt.toUpperCase() === "N/N") {
    return { needed: false };
  }

  const rx = roundTxt.match(/round\s*(\d+)/i);
  const round = rx ? parseInt(rx[1], 10) : null;

  if (!roundTxt && !date) return { needed: false };

  if (date) {
    return { needed: true, round: round || 1, date };
  }

  return { needed: true, round: round || 1, date: null };
}

/** Para tipos sin columna Round clara (Trial Upper / Trial Lasting / Lasting / Finish Date) */
function normalizeByStatusOrDate(statusVal: any, dateVal: any) {
  const statusTxt = String(statusVal || "").trim();
  const date = parseDate(dateVal) || parseDate(statusTxt);

  if (!statusTxt && !date) return { needed: false };
  if (statusTxt.toUpperCase() === "N/N") return { needed: false };

  if (date) return { needed: true, date };

  return { needed: true, date: null };
}

// ---------------- NORMALIZADOR PRINCIPAL ----------------

export function parseCSVText(fileContent: string) {
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  const normalized = (parsed.data as any[]).map((row) => normalizeRow(row));
  return groupRowsByPO(normalized);
}

function normalizeRow(row: Record<string, any>) {
  // --- CABECERA ---
  const po = getAny(row, ["PO"]);
  const supplier = getAny(row, ["SUPPLIER"]);
  const factory = getAny(row, ["FACTORY"]);
  const customer = getAny(row, ["CUSTOMER"]);
  const season = getAny(row, ["SEASON"]);
  const category = getAny(row, ["CATEGORY"]);
  const channel = getAny(row, ["CHANNEL"]);
  const currency = getAny(row, ["CURRENCY"]) || "USD";

  const poDate = parseDate(getAny(row, ["PO DATE"]));
  const etdPi = parseDate(getAny(row, ["ETD PI"]));
  const booking = parseDate(getAny(row, ["BOOKING"]));
  const shipping = parseDate(getAny(row, ["SHIPPING DATE", "SHIPPING"]));
  const closing = parseDate(getAny(row, ["CLOSING"]));
  const pi = getAny(row, ["PI", "PI BSG", "PROFORMA", "PI NUMBER"]);
  const estadoInsp = getAny(row, ["INSPECTION STATUS"]);

  // --- LÍNEA ---
  const reference = getAny(row, ["REFERENCE"]);
  const style = getAny(row, ["STYLE"]);
  const color = getAny(row, ["COLOR"]);
  const qty = parseQtyEU(getAny(row, ["QTY"]));
  const price = parseMoneyEU(getAny(row, ["PRICE"]));
  const rawAmount = parseMoneyEU(getAny(row, ["AMOUNT"]));
  const amount = rawAmount || +(qty * price).toFixed(2);

  // --- MUESTRAS ---
  const samples = {
    cfm: normalizeFromRoundAndDate(getAny(row, ["CFMs ROUND"]), getAny(row, ["CFMs"])),
    counter_sample: normalizeFromRoundAndDate(
      getAny(row, ["COUNTER SAMPLE ROUND"]),
      getAny(row, ["COUNTER SAMPLE"])
    ),
    fitting: normalizeFromRoundAndDate(
      getAny(row, ["FITTING ROUND"]),
      getAny(row, ["FITTING"])
    ),
    pps: normalizeFromRoundAndDate(getAny(row, ["PPS ROUND"]), getAny(row, ["PPS"])),
    testing_sample: normalizeFromRoundAndDate(
      getAny(row, ["TESTING SAMPLES ROUND"]),
      getAny(row, ["TESTING SAMPLES"])
    ),
    shipping_sample: normalizeFromRoundAndDate(
      getAny(row, ["SHIPPING SAMPLES ROUND"]),
      getAny(row, ["SHIPPING SAMPLES"])
    ),
    inspection: normalizeFromRoundAndDate(
      getAny(row, ["INSPECTION ROUND"]),
      getAny(row, ["INSPECTION"])
    ),
    trial_upper: normalizeByStatusOrDate(
      getAny(row, ["TRIAL UPPER STATUS"]),
      getAny(row, ["TRIAL UPPER"])
    ),
    trial_lasting: normalizeByStatusOrDate(
      getAny(row, ["TRIAL LASTING STATUS"]),
      getAny(row, ["TRIAL LASTING"])
    ),
    lasting: normalizeByStatusOrDate(
      getAny(row, ["LASTING STATUS"]),
      getAny(row, ["LASTING"])
    ),
    finish_date: normalizeByStatusOrDate(
      getAny(row, ["FINISH DATE STATUS"]),
      getAny(row, ["FINISH DATE"])
    ),
  };

  return {
    header: {
      po,
      supplier,
      factory,
      customer,
      season,
      category,
      channel,
      currency,
      po_date: poDate,
      etd_pi: etdPi,
      booking,
      shipping_date: shipping,
      closing,
      pi,
      estado_inspeccion: estadoInsp,
    },
    line: {
      reference,
      style,
      color,
      qty,
      price,
      amount,
      ...samples,
    },
  };
}

// ---------------- AGRUPADOR POR PO ----------------

function groupRowsByPO(rows: any[]) {
  const groups: Record<string, { header: any; lines: any[] }> = {};

  for (const { header, line } of rows) {
    const key = header.po || "UNKNOWN";
    if (!groups[key]) groups[key] = { header, lines: [] };
    groups[key].lines.push(line);
  }

  return Object.values(groups);
}
