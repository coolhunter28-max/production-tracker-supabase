import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ============================================================
   🔵 HELPERS
   ============================================================ */

// Extrae solo número del Round → devuelve string o "N/A"
function extractRound(v: any): string {
  if (!v) return "N/A";
  const match = String(v).match(/\d+/);
  return match ? match[0] : "N/A";
}

// Suma días a una fecha (YYYY-MM-DD)
function addDays(base: string | null, days: number): string | null {
  if (!base) return null;
  const f = new Date(base);
  f.setDate(f.getDate() + days);
  return f.toISOString().substring(0, 10);
}

// Calcula fecha teórica según tipo de muestra
function calcTeorica(tipo: string, poDate: string | null, finish: string | null): string | null {
  if (!poDate && !finish) return null;

  switch (tipo) {
    case "CFMs":
      return addDays(poDate, 25);
    case "CounterS":
      return addDays(poDate, 10);
    case "FittingS":
      return addDays(poDate, 25);
    case "PPS":
      return addDays(poDate, 45);
    case "TestingS":
      return finish ? addDays(finish, -14) : null;
    case "ShippingS":
      return finish ? addDays(finish, -7) : null;
    default:
      return null;
  }
}

// Normaliza muestra CSV → fecha real, round, fecha_teorica y estado
function normalizeSample(csvRound: any, csvDate: any, tipo: string, poDate: any, finish: any) {
  const necesita = csvRound && !String(csvRound).includes("N/N");

  if (!necesita) return null;

  const round = extractRound(csvRound);
  const fecha_muestra = csvDate || null;
  const fecha_teorica = fecha_muestra ? null : calcTeorica(tipo, poDate, finish);

  let estado = "pendiente";

  if (fecha_muestra) {
    const hoy = new Date().toISOString().substring(0, 10);
    estado = fecha_muestra < hoy ? "enviada" : "pendiente";
  }

  return {
    tipo_muestra: tipo,
    fecha_muestra,
    fecha_teorica,
    round,
    estado_muestra: estado,
    notas: null,
  };
}

/* ============================================================
   🔵 HANDLER PRINCIPAL
   ============================================================ */

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    console.log("🚀 Iniciando importación:", fileName);
    let ok = 0,
      errores = 0;

    for (const poGroup of groupedPOs) {
      const { header, lines } = poGroup;

      /* =====================================================
         1️⃣ BUSCAR SI EL PO EXISTE
      ===================================================== */
      const { data: existing } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      let poId = existing?.id ?? null;

      /* =====================================================
         2️⃣ LIMPIAR HEADER → SOLO CAMPOS VALIDOS DE POS
      ===================================================== */
      const poData = {
        po: header.po,
        supplier: header.supplier || null,
        factory: header.factory || null,
        customer: header.customer || null,
        season: header.season || null,
        po_date: header.po_date || null,
        etd_pi: header.etd_pi || null,
        booking: header.booking || null,
        closing: header.closing || null,
        shipping_date: header.shipping_date || null,
        currency: header.currency || "USD",
        pi: header.pi || null,
        estado_inspeccion: header.estado_inspeccion || null,
      };

      /* =====================================================
         3️⃣ INSERTAR / ACTUALIZAR PO
      ===================================================== */
      if (poId) {
        const { error: updErr } = await supabase
          .from("pos")
          .update(poData)
          .eq("id", poId);

        if (updErr) {
          errores++;
          console.error("❌ Error ACTUALIZANDO PO:", updErr);
          continue;
        }
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("pos")
          .insert(poData)
          .select("id")
          .single();

        if (insErr || !inserted) {
          errores++;
          console.error("❌ Error INSERTANDO PO:", insErr);
          continue;
        }

        poId = inserted.id;
      }

      /* =====================================================
         4️⃣ BORRAR LÍNEAS Y MUESTRAS ANTIGUAS
      ===================================================== */
      const { data: oldLines } = await supabase
        .from("lineas_pedido")
        .select("id")
        .eq("po_id", poId);

      if (oldLines?.length) {
        const ids = oldLines.map((l) => l.id);
        await supabase.from("muestras").delete().in("linea_pedido_id", ids);
        await supabase.from("lineas_pedido").delete().in("id", ids);
      }

      /* =====================================================
         5️⃣ INSERTAR LÍNEAS NUEVAS
      ===================================================== */
      const { data: insertedLines, error: insLinesErr } = await supabase
        .from("lineas_pedido")
        .insert(
          lines.map((l) => ({
            po_id: poId,
            reference: l.reference,
            style: l.style,
            color: l.color,
            size_run: l.size_run,
            qty: l.qty,
            price: l.price,
            amount: l.amount,
            category: l.category,
            channel: l.channel,
            trial_upper: l.trial_upper,
            trial_lasting: l.trial_lasting,
            lasting: l.lasting,
            finish_date: l.finish_date,
          }))
        )
        .select("id, reference, style, color, finish_date");

      if (insLinesErr) {
        errores++;
        console.error("❌ Error insertando líneas:", insLinesErr);
        continue;
      }

      /* =====================================================
         6️⃣ INSERTAR MUESTRAS (SOLO SI ROUND ≠ N/N)
      ===================================================== */
      const samplesInsert = [];

      for (const line of insertedLines) {
        const original = lines.find(
          (l) =>
            l.reference === line.reference &&
            l.style === line.style &&
            l.color === line.color
        );

        if (!original) continue;

        const tipos = [
          ["CFMs", "cfm_round", "cfm_date"],
          ["CounterS", "counter_round", "counter_date"],
          ["FittingS", "fitting_round", "fitting_date"],
          ["PPS", "pps_round", "pps_date"],
          ["TestingS", "testing_round", "testing_date"],
          ["ShippingS", "shipping_round", "shipping_date"],
        ];

        for (const [tipo, colRound, colDate] of tipos) {
          const muestra = normalizeSample(
            original[colRound],
            original[colDate],
            tipo,
            poData.po_date,
            line.finish_date
          );

          if (muestra) {
            samplesInsert.push({
              ...muestra,
              linea_pedido_id: line.id,
            });
          }
        }
      }

      if (samplesInsert.length > 0) {
        await supabase.from("muestras").insert(samplesInsert);
      }

      ok++;
    }

    return NextResponse.json({
      mensaje: "Importación finalizada",
      ok,
      errores,
    });
  } catch (error: any) {
    console.error("❌ ERROR IMPORT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
