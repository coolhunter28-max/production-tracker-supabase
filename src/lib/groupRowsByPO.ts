// src/lib/groupRowsByPO.ts
import Papa from "papaparse";

/** ---------- Utilidades base ---------- */
const cleanKey = (k: string) =>
  (k ? String(k).trim().toLowerCase().replace(/\s+|[_\-.]/g, "") : "");

const getAny = (row: Record<string, any>, labels: string[]) => {
  const keys = Object.keys(row);
  for (const label of labels) {
    const found = keys.find((k) => cleanKey(k) === cleanKey(label));
    if (found) return row[found];
  }
  return "";
};

const parseQty = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const onlyDigits = String(val).replace(/[^\d]/g, "");
  if (!onlyDigits) return 0;
  return parseInt(onlyDigits, 10) || 0;
};

const parseMoney = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val)
    .replace(/[^\d,.\-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const parseDateEU = (val: any): string | null => {
  if (!val) return null;
  const s = String(val).trim();
  // soporta dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;

  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = (parseInt(y, 10) >= 70 ? "19" : "20") + y;
  const yyyy = y.padStart(4, "0");
  const mm = mo.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** ---------- Tipos ---------- */
export type SampleStatus = {
  needed: boolean;
  status?: string | null;
  round?: string | null;
  date?: string | null;       // fecha principal (muestra enviada/recibida)
  notes?: string | null;      // para "CFM 2025-10-25", etc.
};

export type LineData = {
  style: string;
  color: string;
  reference: string;
  qty: number;
  price: number;
  amount?: number;

  // Muestras (solo estas van a tabla `muestras`)
  cfm?: SampleStatus;
  counter_sample?: SampleStatus;
  fitting?: SampleStatus;
  pps?: SampleStatus;
  testing_sample?: SampleStatus;
  shipping_sample?: SampleStatus;
  inspection?: SampleStatus;

  // Fechas de proceso (NO se crean en `muestras`)
  trial_upper?: SampleStatus;    // solo fecha
  trial_lasting?: SampleStatus;  // solo fecha
  lasting?: SampleStatus;        // solo fecha
  finish_date?: SampleStatus;    // solo fecha
};

export type POHeader = {
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
};

export type POGroup = {
  header: POHeader;
  lines: LineData[];
};

/** ---------- Lógica de estado ---------- */
function stateFromRoundAndDate(round: string | null | undefined, date: string | null | undefined): "No need" | "In progress" | "Not started" {
  const r = (round || "").trim();
  if (!r || r.toUpperCase() === "N/N") return "No need";
  if (date) return "In progress";
  return "Not started";
}

/** Normaliza una muestra individual combinando:
 *  - round + fecha principal
 *  - columnas de validación (Validation X + fecha) -> fuerza "Confirmed" + notes
 */
function normalizeSample(
  roundRaw: any,
  dateRaw: any,
  validationLabelRaw?: any,   // p.ej. "CFM"
  validationDateRaw?: any     // p.ej. "25/10/2025"
): SampleStatus {
  const round = String(roundRaw || "").trim() || "N/N";
  const date = parseDateEU(dateRaw);
  const needed = !(round.toUpperCase() === "N/N");

  // Por defecto (sin validación explícita)
  let status: SampleStatus["status"] = stateFromRoundAndDate(round, date);

  // Reglas de validación (Confirmed)
  const validationLabel = String(validationLabelRaw || "").trim();
  const validationDate = parseDateEU(validationDateRaw);
  let notes: string | null = null;

  if (validationLabel) {
    status = "Confirmed";
    if (validationDate) notes = `${validationLabel.toUpperCase()} ${validationDate}`;
    else notes = `${validationLabel.toUpperCase()} sin fecha`;
  }

  return {
    needed,
    status,
    round,
    date,
    notes,
  };
}

/** ---------- Parser principal: CSV -> grupos por PO ---------- */
export function groupCSVToPOs(csvText: string): POGroup[] {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as any[]) || [];
  const groups: Record<string, POGroup> = {};

  for (const row of rows) {
    // Cabeceras
    const supplier = getAny(row, ["SUPPLIER"]);
    const season = getAny(row, ["SEASON"]);
    const customer = getAny(row, ["CUSTOMER"]);
    const factory = getAny(row, ["FACTORY"]);
    const po = String(getAny(row, ["PO"]) || "").trim();

    const reference = getAny(row, ["REFERENCE"]);
    const style = getAny(row, ["STYLE"]);
    const color = getAny(row, ["COLOR"]);
    const sizeRun = getAny(row, ["SIZE RUN", "SIZERUN", "SIZE"]);
    const qty = parseQty(getAny(row, ["QTY"]));
    const poDate = parseDateEU(getAny(row, ["PO DATE", "PODATE"]));
    const etdPi = parseDateEU(getAny(row, ["ETD PI", "ETDPI"]));
    const pi = getAny(row, ["PI"]);
    const channel = getAny(row, ["CHANNEL"]);
    const category = getAny(row, ["CATEGORY"]);
    const price = parseMoney(getAny(row, ["PRICE"]));
    const amountRaw = parseMoney(getAny(row, ["AMOUNT", "TOTAL"]));
    const amount = amountRaw || +(qty * price).toFixed(2);
    const pi_bsg = getAny(row, ["PI BSG"]);
    const price_selling = parseMoney(getAny(row, ["PRICE SELLING"]));
    const amount_selling = parseMoney(getAny(row, ["AMOUNT SELLING"]));

    const booking = parseDateEU(getAny(row, ["BOOKING", "BOOKING DATE"]));
    const closing = parseDateEU(getAny(row, ["CLOSING", "CLOSING DATE"]));
    const shipping_date = parseDateEU(getAny(row, ["SHIPPING DATE", "SHIPPING"]));
    const currency = "USD"; // por defecto, puedes cambiar si hay columna de currency

    // Muestras + Validación
    const cfm = normalizeSample(
      getAny(row, ["CFMs Round", "CFM Round", "CFMS ROUND"]),
      parseDateEU(getAny(row, ["CFMs", "CFM", "CFM DATE"])),
      getAny(row, ["Validation CFMs"]),
      parseDateEU(getAny(row, ["Validation CFMs Date", "CFMs Approval Date"]))
    );

    const counter = normalizeSample(
      getAny(row, ["Counter Sample Round"]),
      parseDateEU(getAny(row, ["Counter Sample"])),
      getAny(row, ["Validation Counter Sample"]),
      parseDateEU(getAny(row, ["Validation Counter Sample Date"]))
    );

    const fitting = normalizeSample(
      getAny(row, ["Fitting Round"]),
      parseDateEU(getAny(row, ["Fitting"])),
      getAny(row, ["Validation Fitting"]),
      parseDateEU(getAny(row, ["Validation Fitting Date"]))
    );

    const pps = normalizeSample(
      getAny(row, ["PPS Round"]),
      parseDateEU(getAny(row, ["PPS"])),
      getAny(row, ["Validation PPS"]),
      parseDateEU(getAny(row, ["Validation PPS Date"]))
    );

    const testing = normalizeSample(
      getAny(row, ["Testing Samples Round"]),
      parseDateEU(getAny(row, ["Testing Samples"])),
      getAny(row, ["Validation Testing Samples"]),
      parseDateEU(getAny(row, ["Validation Testing Samples Date"]))
    );

    const shippingSmp = normalizeSample(
      getAny(row, ["Shipping Samples Round"]),
      parseDateEU(getAny(row, ["Shipping Samples"])),
      getAny(row, ["Validation Shipping Samples"]),
      parseDateEU(getAny(row, ["Validation Shipping Samples Date"]))
    );

    const inspection = normalizeSample(
      getAny(row, ["Inspection Round"]),
      parseDateEU(getAny(row, ["Inspection"])),
      getAny(row, ["Validation Inspection"]),
      parseDateEU(getAny(row, ["Validation Inspection Date"]))
    );

    // Fechas de proceso (NO muestras)
    const trialUpper = parseDateEU(getAny(row, ["Trial Upper"]));
    const trialLasting = parseDateEU(getAny(row, ["Trial Lasting"]));
    const lasting = parseDateEU(getAny(row, ["Lasting"]));
    const finishDate = parseDateEU(getAny(row, ["FINISH DATE", "Finish Date"]));

    // estado inspección (opcional)
    const estado_inspeccion = getAny(row, ["Inspection Status", "INSPECTION STATUS"]);

    // Agregar grupo
    const key = po || "UNKNOWN";
    if (!groups[key]) {
      groups[key] = {
        header: {
          po,
          supplier,
          factory,
          customer,
          season,
          category,
          channel,
          po_date: poDate,
          etd_pi: etdPi,
          booking,
          closing,
          shipping_date,
          currency,
          pi,
          estado_inspeccion,
        },
        lines: [],
      };
    }

    groups[key].lines.push({
      reference,
      style,
      color,
      qty,
      price,
      amount,

      cfm,
      counter_sample: counter,
      fitting,
      pps,
      testing_sample: testing,
      shipping_sample: shippingSmp,
      inspection,

      trial_upper: trialUpper ? { needed: true, date: trialUpper } : { needed: false },
      trial_lasting: trialLasting ? { needed: true, date: trialLasting } : { needed: false },
      lasting: lasting ? { needed: true, date: lasting } : { needed: false },
      finish_date: finishDate ? { needed: true, date: finishDate } : { needed: false },
    });
  }

  return Object.values(groups);
}
