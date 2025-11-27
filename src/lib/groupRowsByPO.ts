import { parseMoney, parseQty, parseDate } from "./parse-utils";

function buildNota(approval?: string, approvalDate?: string): string {
  if (!approval) return "-";
  const txt = approval.toLowerCase();
  if (txt.includes("confirmed")) return `Confirmed ${approvalDate || ""}`.trim();
  if (txt.includes("n/cfm")) return `Not Confirmed ${approvalDate || ""}`.trim();
  return "-";
}

export function groupRowsByPO(rows: any[]) {
  const grouped = new Map<string, any>();

  for (const row of rows) {
    const poNumber = (row["PO#"] || row["PO"] || "").toString().trim();
    if (!poNumber) continue;

    // --- CABECERA ---
    if (!grouped.has(poNumber)) {
      grouped.set(poNumber, {
        po: poNumber,
        supplier: row["Supplier"] || "",
        customer: row["Customer"] || "",
        factory: row["Factory"] || "",
        season: row["Season"] || "",
        currency: row["Currency"] || "",
        booking: parseDate(row["Booking"]),
        shipping_date: parseDate(row["Shipping"]),
        closing: parseDate(row["Closing"]),
        po_date: parseDate(row["PO Date"]),
        etd_pi: parseDate(row["ETD PI"]),
        pi: row["PI"] || "",
        channel: row["Channel"] || "",
        category: row["Category"] || "",
        lines: [],
        muestras: [],
      });
    }

    const po = grouped.get(poNumber);

    // --- LÍNEA DE PEDIDO ---
    const line = {
      reference: row["Reference"] || "-",
      style: row["Style"] || "-",
      color: row["Color"] || "-",
      size_run: row["SIZE RUN"] || row["Size Run"] || null,
      qty: parseQty(row["Qty"]),
      price: parseMoney(row["Price"]),
      amount: parseMoney(row["Amount"]),
      category: row["Category"] || null,
      channel: row["Channel"] || null,
      trial_upper: parseDate(row["Trial U"]) || null,
      trial_lasting: parseDate(row["Trial L"]) || null,
      lasting: parseDate(row["Lasting"]) || null,
      finish_date: parseDate(row["Finish"]) || null,
      cfm: parseDate(row["CFM"]),
      counter_sample: parseDate(row["Counter Sample"]),
      fitting: parseDate(row["Fitting"]),
      pps: parseDate(row["PPS"]),
      testing_sample: parseDate(row["Testing Sample"]),
      shipping_sample: parseDate(row["Shipping Sample"]),
      inspection: parseDate(row["Inspection"]),
    };

    po.lines.push(line);

    // --- MUESTRAS (CFM → INSPECTION) ---
    const samples = [
      {
        key: "CFM",
        date: line.cfm,
        aprob: row["CFMs Approval"],
        aprobDate: row["CFMs Approval Date"],
      },
      {
        key: "COUNTER_SAMPLE",
        date: line.counter_sample,
        aprob: row["Counter Sample Approval"],
        aprobDate: row["Counter Sample Approval Date"],
      },
      {
        key: "FITTING",
        date: line.fitting,
        aprob: row["Fitting Approval"],
        aprobDate: row["Fitting Approval Date"],
      },
      {
        key: "PPS",
        date: line.pps,
        aprob: row["PPS Approval"],
        aprobDate: row["PPS Approval Date"],
      },
      {
        key: "TESTING_SAMPLE",
        date: line.testing_sample,
        aprob: row["Testing Samples Approval"],
        aprobDate: row["Testing Samples Approval Date"],
      },
      {
        key: "SHIPPING_SAMPLE",
        date: line.shipping_sample,
        aprob: row["Shipping Samples Approval"],
        aprobDate: row["Shipping Samples Approval Date"],
      },
      {
        key: "INSPECTION",
        date: line.inspection,
        aprob: row["Inspection Approval"],
        aprobDate: row["Inspection Approval Date"],
      },
    ];

    for (const s of samples) {
      if (!s.date && !s.aprob && !s.aprobDate) continue;
      const estado =
        s.date === "N/N"
          ? "No Need"
          : s.date
          ? "In Progress"
          : "Not Started";

      po.muestras.push({
        tipo_muestra: s.key,
        fecha_muestra: s.date || null,
        estado_muestra: estado,
        round: s.date === "N/N" ? "N/N" : "1",
        notas: buildNota(s.aprob, s.aprobDate),
      });
    }
  }

  return Array.from(grouped.values());
}
