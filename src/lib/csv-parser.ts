// src/lib/csv-parser.ts
import Papa from 'papaparse';
import { parseDate, parseIntES, parseMoneyES } from './csv-utils';

export type CSVRow = Record<string, string>;

export interface ParsedPO {
  header: POHeaderInput;
  lines: LineDataInput[];
  samples: SampleInput[];
}

export interface POHeaderInput {
  po: string;
  supplier: string;
  factory: string;
  customer: string;
  season: string;
  category: string;
  channel: string;
  pi: string | null;
  po_date: string | null; // ISO date
  etd_pi: string | null;
  booking: string | null;
  closing: string | null;
  shipping_date: string | null;
  currency: string;
}

export interface LineDataInput {
  reference: string;
  style: string;
  color: string;
  size_run: string;
  qty: number;
  price: number;
  amount: number;
  trial_upper: string | null;
  trial_lasting: string | null;
  lasting: string | null;
  finish_date: string | null;
}

export interface SampleInput {
  tipo_muestra: string;
  round: string | null;
  fecha_muestra: string | null;
  estado_muestra: 'Not Started' | 'In Progress' | 'Confirmed' | 'No Need';
  notas: string | null;
}

const SAMPLE_TYPES = ['CFM', 'Counter Sample', 'Fitting', 'PPS', 'Testing Samples', 'Shipping Samples', 'Inspection'] as const;

export function parseCSV(fileContent: string): ParsedPO[] {
  const parsed = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toUpperCase().replace(/\s+/g, '_').replace(/\./g, ''),
  });

  const groupedByPO = new Map<string, CSVRow[]>();
  parsed.data.forEach(row => {
    const po = row['PO']?.trim();
    if (!po) return;
    if (!groupedByPO.has(po)) groupedByPO.set(po, []);
    groupedByPO.get(po)!.push(row);
  });

  const results: ParsedPO[] = [];

  groupedByPO.forEach((rows, po) => {
    const firstRow = rows[0];
    
    // 1. Parse Header
    const header: POHeaderInput = {
      po: po,
      supplier: firstRow['SUPPLIER']?.trim() ?? '',
      factory: firstRow['FACTORY']?.trim() ?? '',
      customer: firstRow['CUSTOMER']?.trim() ?? '',
      season: firstRow['SEASON']?.trim() ?? '',
      category: firstRow['CATEGORY']?.trim() ?? '',
      channel: firstRow['CHANNEL']?.trim() ?? '',
      pi: firstRow['PI']?.trim() || null,
      po_date: parseDate(firstRow['PO_DATE']),
      etd_pi: parseDate(firstRow['ETD_PI']),
      booking: parseDate(firstRow['BOOKING']),
      closing: parseDate(firstRow['CLOSING']),
      shipping_date: parseDate(firstRow['SHIPPING_DATE']),
      currency: firstRow['CURRENCY']?.trim() || 'USD',
    };

    // 2. Parse Lines
    const lines: LineDataInput[] = rows.map(row => ({
      reference: row['REFERENCE']?.trim() ?? '',
      style: row['STYLE']?.trim() ?? '',
      color: row['COLOR']?.trim() ?? '',
      size_run: row['SIZE_RUN']?.trim() ?? '',
      qty: parseIntES(row['QTY']) ?? 0,
      price: parseMoneyES(row['PRICE']) ?? 0,
      amount: parseMoneyES(row['AMOUNT']) ?? (parseIntES(row['QTY']) ?? 0) * (parseMoneyES(row['PRICE']) ?? 0),
      trial_upper: parseDate(row['TRIAL_UPPER']),
      trial_lasting: parseDate(row['TRIAL_LASTING']),
      lasting: parseDate(row['LASTING']),
      finish_date: parseDate(row['FINISH_DATE']),
    }));

    // 3. Parse Samples (for each line, create sample records)
    const samples: SampleInput[] = [];
    rows.forEach(row => {
      SAMPLE_TYPES.forEach(tipo => {
        const round = row[`${tipo.toUpperCase()}_ROUND`]?.trim() || null;
        const status = row[`${tipo.toUpperCase()}_STATUS`]?.trim();
        const fecha = parseDate(row[tipo.toUpperCase()]);
        const approval = row[`${tipo.toUpperCase()}_APPROVAL`]?.trim();
        const approvalDate = parseDate(row[`${tipo.toUpperCase()}_APPROVAL_DATE`]);

        // Determinar estado_muestra según la norma v2.1
        let estado: SampleInput['estado_muestra'] = 'Not Started';
        let fechaFinal: string | null = null;
        let notas: string | null = null;

        if (round === 'N/N' || (status && status.toLowerCase() === 'no need')) {
          estado = 'No Need';
          fechaFinal = null;
        } else if (approval?.toLowerCase() === 'confirmed' && approvalDate) {
          estado = 'Confirmed';
          fechaFinal = approvalDate;
          notas = `Confirmed ${approvalDate}`;
        } else if (fecha) {
          estado = 'In Progress';
          fechaFinal = fecha;
          notas = `Not Confirmed ${fecha}`;
        }

        // Solo agregar si hay datos relevantes
        if (fecha || round || status || approval) {
          samples.push({
            tipo_muestra: tipo,
            round: round === '-' ? null : round,
            fecha_muestra: fechaFinal,
            estado_muestra: estado,
            notas,
          });
        }
      });
    });

    results.push({ header, lines, samples });
  });

  return results;
}