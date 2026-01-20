import Papa from "papaparse";

/* ============================================================
   1) PARSEO CSV BÁSICO
   ============================================================ */
export function parseCSVText(csvText: string) {
  const firstLine = csvText.split("\n")[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const { data, errors, meta } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (h) => (h || "").trim(),
  });
  if (errors?.length) console.warn("Errores PapaParse:", errors);
console.log(`Delimitador detectado: "${meta?.delimiter}"`);
  return Array.isArray(data) ? data : [];
}

/* ============================================================
   2) HELPERS
   ============================================================ */
function cleanStr(v: any) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function parseQty(v: any): number {
  const s = cleanStr(v).replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseMoney(v: any): number {
  const s0 = cleanStr(v);
  if (!s0) return 0;
  const s = s0.replace(/[^0-9.,-]/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    const last = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
    const intPart = s.slice(0, last).replace(/[.,]/g, "");
    const decPart = s.slice(last + 1);
    return Number(`${intPart}.${decPart}`) || 0;
  }
  if (hasComma) {
    const p = s.split(",");
    const last = p[p.length - 1];
    if (last.length === 2)
      return Number(`${p.slice(0, -1).join("")}.${last}`) || 0;
    return Number(p.join("")) || 0;
  }
  if (hasDot) {
    const p = s.split(".");
    const last = p[p.length - 1];
    if (last.length === 2)
      return Number(`${p.slice(0, -1).join("")}.${last}`) || 0;
    return Number(p.join("")) || 0;
  }
  return Number(s) || 0;
}

/* ============================================================
   3) FECHAS INTELIGENTES
   ============================================================ */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1,
  feb: 2, february: 2, febrero: 2,
  mar: 3, march: 3, marzo: 3,
  apr: 4, april: 4, abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, junio: 6,
  jul: 7, july: 7, julio: 7,
  aug: 8, august: 8, ago: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, septiembre: 9,
  oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11,
  dec: 12, december: 12, dic: 12, diciembre: 12,
};

function pad2(n: number | string) {
  const s = String(n);
  return s.length === 1 ? `0${s}` : s;
}

function parseDateSmart(v: any, fallbackYear?: number | null): string | null {
  const s = cleanStr(v);
  if (!s) return null;

  let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

  m = s.match(/^(\d{1,2})[\/\-]\s*([A-Za-z]{3,})\s*(?:[\/\-](\d{2,4}))?$/);
  if (m) {
    const dd = Number(m[1]);
    const mon = MONTHS[m[2].toLowerCase()];
    if (!mon) return null;
    let year = null;
    if (m[3]) {
      const y = Number(m[3]);
      year = y < 100 ? 2000 + y : y;
    } else {
      year = fallbackYear ?? null;
    }
    if (!year) return null;
    return `${year}-${pad2(mon)}-${pad2(dd)}`;
  }

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    if (!fallbackYear) return null;
    return `${fallbackYear}-${pad2(m[2])}-${pad2(m[1])}`;
  }

  return null;
}

/* ============================================================
   4) MAPEO DE CAMPOS (incluye APPROVALS + FINANCIAL BSG)
   ============================================================ */

const MAP = {
  po: ["PO", "PO#", "PO NUMBER", "PO_NUMBER"],
  customer: ["CUSTOMER", "Customer"],
  factory: ["FACTORY", "Factory"],
  supplier: ["SUPPLIER", "Supplier"],
  season: ["SEASON", "Season"],
  category: ["CATEGORY", "Category"],
  channel: ["CHANNEL", "Channel"],
  size_run: ["SIZE RUN", "SIZE_RUN", "SIZE", "SIZERUN", "Size Run"],
  pi: ["PI"],

  po_date: ["PO DATE", "PO_DATE"],
  etd_pi: ["ETD PI", "ETD_PI"],
  booking: ["BOOKING", "Booking"],
  closing: ["CLOSING", "Closing"],
  shipping_date: ["SHIPPING DATE", "SHIPPING_DATE", "Shipping Date", "Shipping"],

  reference: ["REFERENCE", "Reference"],
  style: ["STYLE", "Style"],
  color: ["COLOR", "Color"],
  qty: ["QTY", "QUANTITY", "Qty"],
  price: ["PRICE", "Price"],
  amount: ["AMOUNT", "Amount"],

  // ✅ NUEVO: FINANCIAL (BSG)
  pi_bsg: ["PI BSG", "PI_BSG", "PIBSG", "PI_BSG "],
  price_selling: ["PRICE SELLING", "PRICE_SELLING", "PRICE SELLING "],
  amount_selling: ["AMOUNT SELLING", "AMOUNT_SELLING", "AMOUNT SELLING "],

  /* === MUESTRAS FECHA === */
  cfm_date: ["CFMs", "CFM"],
  counter_date: ["Counter Sample"],
  fitting_date: ["Fitting"],
  pps_date: ["PPS"],
  testing_date: ["Testing Samples", "Testing"],
  shipping_date_sample: ["Shipping Samples"],

  /* === MUESTRAS ROUND === */
  cfm_round: ["CFMs Round"],
  counter_round: ["Counter Sample Round"],
  fitting_round: ["Fitting Round"],
  pps_round: ["PPS Round"],
  testing_round: ["Testing Samples Round"],
  shipping_round: ["Shipping Samples Round"],

  /* === APPROVALS === */
  cfm_approval: ["CFMs Approval"],
  cfm_approval_date: ["CFMs Approval Date"],

  counter_approval: ["Counter Sample Approval"],
  counter_approval_date: ["Counter Sample Approval Date"],

  fitting_approval: ["Fitting Approval"],
  fitting_approval_date: ["Fitting Approval Date"],

  pps_approval: ["PPS Approval"],
  pps_approval_date: ["PPS Approval Date"],

  testing_approval: ["Testing Samples Approval"],
  testing_approval_date: ["Testing Samples Approval Date"],

  shipping_approval: ["Shipping Samples Approval"],
  shipping_approval_date: ["Shipping Samples Approval Date"],

  inspection_approval: ["Inspection Approval"],
  inspection_approval_date: ["Inspection Approval Date"],

  /* PRODUCCIÓN */
  trial_upper_date: ["Trial Upper", "Trial U"],
  trial_lasting_date: ["Trial Lasting", "Trial L"],
  lasting_date: ["Lasting"],
  finish_date: ["FINISH DATE", "FINISH", "Finish"],
};

function get(row: any, aliases: string[]) {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null && row[a] !== "") {
      return row[a];
    }
  }
  return undefined;
}

/* ============================================================
   6) AGRUPADOR PRINCIPAL
   ============================================================ */

export function groupRowsByPO(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const po = cleanStr(get(row, MAP.po));
    if (!po) continue;

    if (!map.has(po)) {
      const h = {
        po,
        customer: cleanStr(get(row, MAP.customer)),
        supplier: cleanStr(get(row, MAP.supplier)),
        factory: cleanStr(get(row, MAP.factory)),
        season: cleanStr(get(row, MAP.season)),
        category: cleanStr(get(row, MAP.category)),
        channel: cleanStr(get(row, MAP.channel)),
        size_run: cleanStr(get(row, MAP.size_run)),
        pi: cleanStr(get(row, MAP.pi)),
        po_date: parseDateSmart(get(row, MAP.po_date)),
        etd_pi: parseDateSmart(get(row, MAP.etd_pi)),
        booking: parseDateSmart(get(row, MAP.booking)),
        closing: parseDateSmart(get(row, MAP.closing)),
        shipping_date: parseDateSmart(get(row, MAP.shipping_date)),
        currency: "USD",
        estado_inspeccion: "-",
      };
      map.set(po, { header: h, lines: [] });
    }

    const headerYearStr = (map.get(po).header.po_date ?? "").slice(0, 4);
    const headerYear = headerYearStr ? Number(headerYearStr) : null;

    const qty = parseQty(get(row, MAP.qty));
    const priceSelling = parseMoney(get(row, MAP.price_selling));
    const amountSellingRaw = parseMoney(get(row, MAP.amount_selling));
    const amountSelling = amountSellingRaw || (qty && priceSelling ? qty * priceSelling : 0);

    const line = {
      reference: cleanStr(get(row, MAP.reference)),
      style: cleanStr(get(row, MAP.style)),
      color: cleanStr(get(row, MAP.color)),
      size_run: cleanStr(get(row, MAP.size_run)),
      category: cleanStr(get(row, MAP.category)),
      channel: cleanStr(get(row, MAP.channel)),
      qty,
      price: parseMoney(get(row, MAP.price)),
      amount: parseMoney(get(row, MAP.amount)),

      // ✅ NUEVO: FINANCIAL (BSG)
      pi_bsg: cleanStr(get(row, MAP.pi_bsg)) || null,
      price_selling: priceSelling || 0,
      amount_selling: amountSelling || 0,

      /* === Muestras === */
      cfm: parseDateSmart(get(row, MAP.cfm_date), headerYear),
      cfm_round: cleanStr(get(row, MAP.cfm_round)) || null,
      cfm_approval: cleanStr(get(row, MAP.cfm_approval)) || null,
      cfm_approval_date: parseDateSmart(get(row, MAP.cfm_approval_date), headerYear),

      counter_sample: parseDateSmart(get(row, MAP.counter_date), headerYear),
      counter_round: cleanStr(get(row, MAP.counter_round)) || null,
      counter_approval: cleanStr(get(row, MAP.counter_approval)) || null,
      counter_approval_date: parseDateSmart(get(row, MAP.counter_approval_date), headerYear),

      fitting: parseDateSmart(get(row, MAP.fitting_date), headerYear),
      fitting_round: cleanStr(get(row, MAP.fitting_round)) || null,
      fitting_approval: cleanStr(get(row, MAP.fitting_approval)) || null,
      fitting_approval_date: parseDateSmart(get(row, MAP.fitting_approval_date), headerYear),

      pps: parseDateSmart(get(row, MAP.pps_date), headerYear),
      pps_round: cleanStr(get(row, MAP.pps_round)) || null,
      pps_approval: cleanStr(get(row, MAP.pps_approval)) || null,
      pps_approval_date: parseDateSmart(get(row, MAP.pps_approval_date), headerYear),

      testing_sample: parseDateSmart(get(row, MAP.testing_date), headerYear),
      testing_round: cleanStr(get(row, MAP.testing_round)) || null,
      testing_approval: cleanStr(get(row, MAP.testing_approval)) || null,
      testing_approval_date: parseDateSmart(get(row, MAP.testing_approval_date), headerYear),

      shipping_sample: parseDateSmart(get(row, MAP.shipping_date_sample), headerYear),
      shipping_round: cleanStr(get(row, MAP.shipping_round)) || null,
      shipping_approval: cleanStr(get(row, MAP.shipping_approval)) || null,
      shipping_approval_date: parseDateSmart(get(row, MAP.shipping_approval_date), headerYear),

      inspection_approval: cleanStr(get(row, MAP.inspection_approval)) || null,
      inspection_approval_date: parseDateSmart(get(row, MAP.inspection_approval_date), headerYear),

      /* === Producción === */
      trial_upper: parseDateSmart(get(row, MAP.trial_upper_date), headerYear),
      trial_lasting: parseDateSmart(get(row, MAP.trial_lasting_date), headerYear),
      lasting: parseDateSmart(get(row, MAP.lasting_date), headerYear),
      finish_date: parseDateSmart(get(row, MAP.finish_date), headerYear),
    };

    map.get(po).lines.push(line);
  }

  return Array.from(map.values());
}
