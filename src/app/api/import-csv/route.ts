import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { groupedPOs, fileName } = await req.json();

    console.log("🧾 Archivo recibido:", fileName);
    console.log("📦 Pedidos agrupados recibidos:", groupedPOs?.length);

    if (!groupedPOs || !Array.isArray(groupedPOs)) {
      throw new Error("Datos de pedidos no válidos o vacíos.");
    }

    let success = 0;
    let fail = 0;

    for (const po of groupedPOs) {
      const header = po.header;
      const lines = po.lines || [];

      if (!header?.po) {
        console.warn("⚠️ Pedido sin número PO, se ignora:", header);
        fail++;
        continue;
      }

      // --- Limpieza de valores de fecha que vienen como {needed: false}
      const cleanDate = (val: any) => {
        if (!val) return null;
        if (typeof val === "object" && val.date) return val.date;
        if (typeof val === "object" && val.needed === false) return null;
        return val;
      };

      // --- Datos del PO
      const poData = {
        po: header.po,
        supplier: header.supplier,
        factory: header.factory,
        customer: header.customer,
        season: header.season,
        po_date: cleanDate(header.po_date),
        etd_pi: cleanDate(header.etd_pi),
        booking: cleanDate(header.booking),
        closing: cleanDate(header.closing),
        shipping_date: cleanDate(header.shipping_date),
        pi: header.pi || null,
        inspection: header.inspection || null,
        currency: header.currency || null,
        channel: header.channel || null,
      };

      // --- Verificar si ya existe el PO
      const { data: existingPO, error: findError } = await supabase
        .from("pos")
        .select("id")
        .eq("po", header.po)
        .maybeSingle();

      if (findError) {
        console.error("❌ Error buscando PO existente:", findError.message);
        fail++;
        continue;
      }

      let poId: string;

      if (existingPO) {
        const { error: updateError } = await supabase
          .from("pos")
          .update(poData)
          .eq("id", existingPO.id);
        if (updateError) {
          console.error("❌ Error actualizando PO:", updateError.message);
          fail++;
          continue;
        }
        poId = existingPO.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("pos")
          .insert(poData)
          .select("id")
          .maybeSingle();
        if (insertError || !inserted) {
          console.error("❌ Error insertando nuevo PO:", insertError?.message);
          fail++;
          continue;
        }
        poId = inserted.id;
      }

      // --- Borrar líneas anteriores
      await supabase.from("lineas_pedido").delete().eq("po_id", poId);

      // --- Insertar líneas nuevas
      for (const line of lines) {
        const lineData = {
          po_id: poId,
          reference: line.reference,
          style: line.style,
          color: line.color,
          size_run: line.size_run,
          qty: line.qty,
          category: line.category || null,
          price: line.price,
          amount: line.amount,
          pi_bsg: line.pi_bsg,
          price_selling: line.price_selling,
          amount_selling: line.amount_selling,
          trial_upper: cleanDate(line.trial_upper),
          trial_lasting: cleanDate(line.trial_lasting),
          lasting: cleanDate(line.lasting),
          finish_date: cleanDate(line.finish_date),
          etd: cleanDate(line.etd),
          inspection: cleanDate(line.inspection),
          estado_inspeccion: line.estado_inspeccion || null,
          channel: line.channel,
        };

        const { data: insertedLine, error: insertLineError } = await supabase
          .from("lineas_pedido")
          .insert(lineData)
          .select("id")
          .maybeSingle();

        if (insertLineError || !insertedLine) {
          console.error("❌ Error insertando línea:", insertLineError?.message);
          continue;
        }

        const lineId = insertedLine.id;

        // --- Insertar muestras asociadas
        const sampleTypes = [
          "cfm",
          "counter_sample",
          "fitting",
          "pps",
          "testing_sample",
          "shipping_sample",
          "trial_upper",
          "trial_lasting",
          "lasting",
          "finish_date",
          "inspection",
        ];

        for (const tipo of sampleTypes) {
          const roundVal =
            line[`${tipo}_round`] || line[`${tipo}Round`] || "N/N";
          const fechaVal = cleanDate(line[tipo]);
          const estadoVal = fechaVal
            ? "Confirmed"
            : line[`${tipo}_approval`] || "Pending";

          const muestraData = {
            linea_pedido_id: lineId,
            tipo_muestra: tipo,
            round: roundVal || "N/N",
            fecha_muestra: fechaVal,
            estado_muestra: estadoVal,
            notas: line[`${tipo}_notes`] || "-",
          };

          const { error: insertMuestraError } = await supabase
            .from("muestras")
            .insert(muestraData);

          if (insertMuestraError) {
            console.error("❌ Error insertando muestra:", insertMuestraError.message);
          }
        }
      }

      success++;
    }

    console.log("✅ Importación finalizada");
    return NextResponse.json({
      success,
      fail,
      summary: `Importación completada (${success} correctos, ${fail} fallidos)`,
    });
  } catch (err: any) {
    console.error("❌ Error general:", err);
    return NextResponse.json(
      { error: err.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
