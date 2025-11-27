import { supabase } from "@/lib/supabase";

interface SampleStatus {
  needed: boolean;
  round?: number | null;
  date?: string | null;
}

interface LineData {
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

interface POHeader {
  po?: string;
  supplier?: string;
  factory?: string;
  customer?: string;
  season?: string;
  category?: string;
  channel?: string;
  currency?: string;
  po_date?: string;
  etd_pi?: string;
  booking?: string;
  closing?: string;
  shipping_date?: string;
  pi?: string;
  estado_inspeccion?: string;
}

interface POGroup {
  header: POHeader;
  lines: LineData[];
}

export async function syncToSupabase(poGroups: POGroup[]) {
  const results = {
    total: poGroups.length,
    newPOs: 0,
    updatedPOs: 0,
    unchangedPOs: 0,
    updatedLines: 0,
    updatedSamples: 0,
    errors: [] as string[],
    newPOList: [] as string[],
    updatedPOList: [] as string[],
    unchangedPOList: [] as string[],
  };

  try {
    // === 1️⃣ Cargar POs existentes ===
    const { data: existingPOs, error: fetchError } = await supabase
      .from("pos")
      .select(
        "id, po, supplier, factory, customer, season, category, channel, currency, po_date, etd_pi, booking, shipping_date, closing, pi, estado_inspeccion"
      );

    if (fetchError) throw fetchError;

    // === 2️⃣ Función de normalización ===
    const normalizeValue = (v: any) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return v.toString();
      if (typeof v === "boolean") return v ? "true" : "false";
      if (typeof v === "object" && v instanceof Date)
        return v.toISOString().split("T")[0];
      return String(v).trim();
    };

    // === 3️⃣ Normalización de código PO (sin romper formato original) ===
    const normalizePO = (v: string | undefined) => {
      if (!v) return "";
      return String(v).trim().replace(/\s+/g, "").toUpperCase();
    };

    // === 4️⃣ Mapa de POs existentes ===
    const poMap = new Map<string, any>();
    existingPOs?.forEach((po) => {
      const key = normalizePO(po.po);
      poMap.set(key, po);
    });

    console.log("📦 POs existentes en Supabase:", existingPOs?.length);
    console.log("Ejemplo de PO existente:", existingPOs?.[0]?.po);

    // === 5️⃣ Procesar cada grupo del CSV ===
    for (const po of poGroups) {
      const { header, lines } = po;
      const poNumber = normalizePO(header.po);
      if (!poNumber) continue;

      const existing = poMap.get(poNumber);

      const poRecord = {
        po: header.po,
        supplier: header.supplier,
        factory: header.factory,
        customer: header.customer,
        season: header.season,
        category: header.category,
        channel: header.channel,
        currency: header.currency,
        po_date: header.po_date,
        etd_pi: header.etd_pi,
        booking: header.booking,
        closing: header.closing,
        shipping_date: header.shipping_date,
        pi: header.pi,
        estado_inspeccion: header.estado_inspeccion,
        updated_at: new Date().toISOString(),
      };

      let hasChanges = false;
      if (existing) {
        hasChanges = Object.keys(poRecord).some((k) => {
          const newVal = normalizeValue(poRecord[k as keyof typeof poRecord]);
          const oldVal = normalizeValue(existing[k]);
          return newVal !== oldVal;
        });

        if (hasChanges) {
          console.log(`🟦 PO ${header.po} → cambios detectados`);
        }
      }

      // === 6️⃣ Insertar o actualizar ===
      let poId = existing?.id;

      if (!existing) {
        const { data, error: insertErr } = await supabase
          .from("pos")
          .insert(poRecord)
          .select("id")
          .single();

        if (insertErr) {
          results.errors.push(`PO ${header.po}: ${insertErr.message}`);
          continue;
        }
        poId = data.id;
        results.newPOs++;
        results.newPOList.push(header.po || "");
      } else if (hasChanges) {
        const { error: updateErr } = await supabase
          .from("pos")
          .update(poRecord)
          .eq("po", header.po);

        if (updateErr) {
          results.errors.push(`PO ${header.po}: ${updateErr.message}`);
        } else {
          results.updatedPOs++;
          results.updatedPOList.push(header.po || "");
        }
      } else {
        results.unchangedPOs++;
        results.unchangedPOList.push(header.po || "");
      }

      // === 7️⃣ Sincronizar líneas ===
      const { data: existingLines } = await supabase
        .from("lineas_pedido")
        .select("id, po_id, reference, color, qty, price, amount")
        .eq("po_id", poId);

      const lineKey = (r: any) => `${r.reference}-${r.color}`.toUpperCase();
      const lineMap = new Map<string, any>();
      existingLines?.forEach((l) => lineMap.set(lineKey(l), l));

      for (const line of lines) {
        const key = lineKey(line);
        const existingLine = lineMap.get(key);
        const record = {
          po_id: poId,
          reference: line.reference,
          style: line.style,
          color: line.color,
          qty: line.qty,
          price: line.price,
          amount: line.amount,
          updated_at: new Date().toISOString(),
        };

        if (!existingLine) {
          const { error: insertLineErr } = await supabase
            .from("lineas_pedido")
            .insert(record);
          if (insertLineErr) {
            results.errors.push(
              `PO ${header.po} - Línea ${line.reference}: ${insertLineErr.message}`
            );
          } else {
            results.updatedLines++;
          }
        } else {
          const changed = Object.keys(record).some((k) => {
            const newVal = normalizeValue(record[k as keyof typeof record]);
            const oldVal = normalizeValue(existingLine[k]);
            return newVal !== oldVal;
          });

          if (changed) {
            const { error: updateLineErr } = await supabase
              .from("lineas_pedido")
              .update(record)
              .eq("id", existingLine.id);
            if (updateLineErr) {
              results.errors.push(
                `PO ${header.po} - Línea ${line.reference}: ${updateLineErr.message}`
              );
            } else {
              results.updatedLines++;
            }
          }
        }

        // === 8️⃣ Sincronizar muestras ===
        const sampleMap: Record<string, SampleStatus | undefined> = {
          cfm: line.cfm,
          counter_sample: line.counter_sample,
          fitting: line.fitting,
          pps: line.pps,
          testing_sample: line.testing_sample,
          shipping_sample: line.shipping_sample,
          inspection: line.inspection,
          trial_upper: line.trial_upper,
          trial_lasting: line.trial_lasting,
          lasting: line.lasting,
          finish_date: line.finish_date,
        };

        for (const [type, sample] of Object.entries(sampleMap)) {
          if (!sample || !sample.needed) continue;

          const { data: existingSample } = await supabase
            .from("muestras")
            .select("id, fecha_muestra, round")
            .eq("linea_pedido_id", existingLine?.id)
            .eq("tipo_muestra", type)
            .maybeSingle();

          if (!existingSample) {
            const { error: insertSampleErr } = await supabase
              .from("muestras")
              .insert({
                linea_pedido_id: existingLine?.id,
                tipo_muestra: type,
                round: sample.round,
                fecha_muestra: sample.date,
              });
            if (insertSampleErr) {
              results.errors.push(
                `PO ${header.po} - Sample ${type}: ${insertSampleErr.message}`
              );
            } else {
              results.updatedSamples++;
            }
          } else if (
            sample.date &&
            sample.date !== existingSample.fecha_muestra
          ) {
            const { error: updateSampleErr } = await supabase
              .from("muestras")
              .update({
                round: sample.round,
                fecha_muestra: sample.date,
              })
              .eq("id", existingSample.id);
            if (updateSampleErr) {
              results.errors.push(
                `PO ${header.po} - Sample ${type}: ${updateSampleErr.message}`
              );
            } else {
              results.updatedSamples++;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error(err);
    results.errors.push(err.message);
  }

  console.log("✅ Resultados syncToSupabase:", results);
  return results;
}
