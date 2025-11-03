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

      // Verificar si el PO ya existe
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

      let poId: string | undefined;

      // Insertar o actualizar encabezado del PO
      const poData = {
        po: header.po,
        supplier: header.supplier,
        factory: header.factory,
        customer: header.customer,
        season: header.season,
        po_date: header.po_date || null,
        etd_pi: header.etd_pi || null,
        booking: header.booking || null,
        closing: header.closing || null,
        shipping_date: header.shipping_date || null,
        pi: header.pi || null,
        channel: header.channel || null,
        currency: header.currency || null,
      };

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

      // Insertar líneas de pedido
      if (!poId) {
        console.error("❌ No se obtuvo ID de PO para insertar líneas");
        fail++;
        continue;
      }

      await supabase.from("lineas_pedido").delete().eq("po_id", poId);

      const lineasData = lines.map((line: any) => ({
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
        trial_upper: line.trial_upper,
        trial_lasting: line.trial_lasting,
        lasting: line.lasting,
        finish_date: line.finish_date,
        etd: line.etd,
        inspection: line.inspection,
        estado_inspeccion: line.estado_inspeccion,
        channel: line.channel,
      }));

      if (lineasData.length > 0) {
        const { error: lineError } = await supabase
          .from("lineas_pedido")
          .insert(lineasData);

        if (lineError) {
          console.error("❌ Error insertando líneas:", lineError.message);
          fail++;
          continue;
        }
      }

      success++;
    }

    console.log("✅ Importación finalizada");
    return NextResponse.json({
      success,
      fail,
      summary: `Importación finalizada (${success} correctos, ${fail} fallidos)`,
    });
  } catch (err: any) {
    console.error("❌ Error general al importar:", err);
    return NextResponse.json(
      { error: err.message || "Error desconocido en importación" },
      { status: 500 }
    );
  }
}
