import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tipos de muestra que mapeamos desde el CSV normalizado
const SAMPLE_TYPES: { key: string; name: string }[] = [
  { key: 'cfm', name: 'CFM' },
  { key: 'counter_sample', name: 'Counter Sample' },
  { key: 'fitting', name: 'Fitting' },
  { key: 'pps', name: 'PPS' },
  { key: 'testing_samples', name: 'Testing Samples' },
  { key: 'shipping_samples', name: 'Shipping Samples' },
  { key: 'trial_upper', name: 'Trial Upper' },
  { key: 'trial_lasting', name: 'Trial Lasting' },
  { key: 'lasting', name: 'Lasting' },
  { key: 'finish', name: 'Finish' },
  { key: 'inspection', name: 'Inspection' },
];

// Construye el “expected” de muestras a partir de una línea normalizada del CSV
function expectedSamplesFromCsvLine(line: any) {
  const out: { tipo_muestra: string; round: number; estado_muestra?: string; fecha_muestra?: string | null }[] = [];
  for (const t of SAMPLE_TYPES) {
    const status = line[`${t.key}_status`];
    const round = Number(line[`${t.key}_round`] || 1);
    // fecha: usar *_approval_date | *_approval | finish_date como fallback para "Finish"
    const date =
      line[`${t.key}_approval_date`] ||
      line[`${t.key}_approval`] ||
      (t.key === 'finish' ? line.finish_date : undefined);

    if (status || date) {
      out.push({
        tipo_muestra: t.name,
        round,
        estado_muestra: status,
        fecha_muestra: date || null,
      });
    }
  }
  return out;
}

/**
 * Compara groupedPOs (CSV normalizado y agrupado) contra Supabase.
 * Devuelve por PO: nuevo / modificado / sin cambios + diffs de cabecera, líneas y muestras.
 */
export async function compareWithSupabase(groupedPOs: any[]) {
  const poNumbers = groupedPOs.map((po) => po.header.po_number);

  // Traemos POs con líneas y sus muestras
  const { data: existingPOs, error } = await supabase
    .from('pos')
    .select(`
      id, po, supplier, factory, customer, season, booking, etd_pi, shipping_date, closing,
      lineas_pedido (
        id, reference, style, color, qty, price, amount,
        muestras ( id, tipo_muestra, round, estado_muestra, fecha_muestra )
      )
    `)
    .in('po', poNumbers);

  if (error) throw error;

  const results: any[] = [];

  for (const po of groupedPOs) {
    const current = po.header;
    const found = existingPOs?.find((x) => x.po === current.po_number);

    if (!found) {
      results.push({ po: current.po_number, status: 'nuevo' });
      continue;
    }

    // 1) Comparar CABECERA
    const headerMapCsv = {
      supplier: current.supplier || '',
      factory: current.factory || '',
      customer: current.customer || '',
      season: current.season || '',
      booking: current.booking_date || '',
      etd_pi: current.etd_pi || '',
      shipping_date: current.shipping_date || '',
      closing: current.closing_date || '',
    };
    const headerFields = Object.keys(headerMapCsv) as (keyof typeof headerMapCsv)[];
    const headerDiffs = headerFields.filter((f) => String(found[f] || '') !== String(headerMapCsv[f] || ''));

    // 2) Comparar LÍNEAS (por reference)
    const existingLines = (found.lineas_pedido || []) as any[];
    const csvLines = po.lines || [];
    const lineDiffs: string[] = [];
    const sampleDiffs: { ref: string; diffs: string[] }[] = [];

    for (const line of csvLines) {
      const match = existingLines.find((l) => l.reference === line.reference);
      if (!match) {
        lineDiffs.push(`+${line.reference}`); // línea nueva
        // también sus muestras serían nuevas, pero no hace falta detallar cada una aquí
        continue;
      }

      // Comparar campos básicos de línea
      const fieldsToCheck = ['qty', 'price', 'amount'] as const;
      const lineHasDiff = fieldsToCheck.some((f) => Number(match[f] ?? 0) !== Number(line[f] ?? 0));
      if (lineHasDiff) lineDiffs.push(line.reference);

      // 3) Comparar MUESTRAS por tipo + round
      const existingSamples = (match.muestras || []) as any[];
      const expectedSamples = expectedSamplesFromCsvLine(line);
      const thisLineSampleDiffs: string[] = [];

      // A) diffs en muestras existentes o nuevas esperadas
      for (const exp of expectedSamples) {
        const foundSample = existingSamples.find(
          (s) => s.tipo_muestra === exp.tipo_muestra && Number(s.round) === Number(exp.round)
        );
        if (!foundSample) {
          thisLineSampleDiffs.push(`${exp.tipo_muestra}#${exp.round}: +nuevo`);
          continue;
        }
        const sDiffs: string[] = [];
        if (String(foundSample.estado_muestra || '') !== String(exp.estado_muestra || '')) {
          sDiffs.push('estado');
        }
        // fecha (permitimos null vs undefined equivalentes)
        const existDate = foundSample.fecha_muestra ? String(foundSample.fecha_muestra) : '';
        const expDate = exp.fecha_muestra ? String(exp.fecha_muestra) : '';
        if (existDate !== expDate) {
          sDiffs.push('fecha');
        }
        if (sDiffs.length) {
          thisLineSampleDiffs.push(`${exp.tipo_muestra}#${exp.round}: ${sDiffs.join(',')}`);
        }
      }

      // B) muestras “sobrantes” en BD que ya no vienen en CSV
      const missingInCsv = existingSamples.filter(
        (s) => !expectedSamples.some((e) => e.tipo_muestra === s.tipo_muestra && Number(e.round) === Number(s.round))
      );
      if (missingInCsv.length) {
        thisLineSampleDiffs.push(
          `-(${missingInCsv.map((s) => `${s.tipo_muestra}#${s.round}`).join(',')})`
        );
      }

      if (thisLineSampleDiffs.length) {
        sampleDiffs.push({ ref: line.reference || '(sin ref)', diffs: thisLineSampleDiffs });
      }
    }

    // C) Líneas que están en BD pero no en CSV (el CSV “borra”)
    const removedLines = existingLines.filter((l) => !csvLines.some((r: any) => r.reference === l.reference));
    if (removedLines.length > 0) lineDiffs.push(`-${removedLines.map((r: any) => r.reference).join(',')}`);

    // Estado final del PO
    if (headerDiffs.length || lineDiffs.length || sampleDiffs.length) {
      results.push({
        po: current.po_number,
        status: 'modificado',
        diffs: {
          header: headerDiffs,      // ej: ['booking','shipping_date']
          lines: lineDiffs,         // ej: ['62007', '+62009', '-62001,62002']
          samples: sampleDiffs,     // ej: [{ref:'62007', diffs:['CFM#1: estado','PPS#1: fecha']}]
        },
      });
    } else {
      results.push({ po: current.po_number, status: 'sin cambios' });
    }
  }

  return results;
}
