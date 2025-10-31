import { createClient } from '@supabase/supabase-js';

// Inicializa cliente Supabase desde variables de entorno
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { groupedPOs, fileName } = await request.json();

    console.log('🧾 Archivo recibido:', fileName);
    console.log('📦 Pedidos agrupados recibidos:', groupedPOs?.length);
    console.log('📄 Ejemplo primer PO:', JSON.stringify(groupedPOs?.[0], null, 2));

    if (!groupedPOs || groupedPOs.length === 0) {
      return Response.json(
        { message: 'No se recibieron pedidos para importar', results: [] },
        { status: 400 }
      );
    }

    const results: any[] = [];
    let nuevos = 0;
    let actualizados = 0;
    let errores = 0;

    // 🧩 Recorre cada pedido
    for (const po of groupedPOs) {
      const header = po.header;
      const lines = po.lines || [];

      try {
        // 🔍 Verificar si el PO ya existe
        const { data: existingPO, error: fetchError } = await supabase
          .from('pos')
          .select('id')
          .eq('po', header.po_number)
          .maybeSingle();

        if (fetchError) throw fetchError;

        let po_id: string;

        // 🆕 Insertar nuevo PO
        if (!existingPO) {
          const { data: newPO, error: insertError } = await supabase
            .from('pos')
            .insert({
              po: header.po_number,
              supplier: header.supplier,
              factory: header.factory,
              customer: header.customer,
              season: header.season,
              po_date: header.po_date,
              etd_pi: header.etd_pi,
              booking: header.booking_date,
              closing: header.closing_date,
              shipping_date: header.shipping_date,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          po_id = newPO.id;
          nuevos++;
        } else {
          // 🟡 Actualizar existente
          const { error: updateError } = await supabase
            .from('pos')
            .update({
              supplier: header.supplier,
              factory: header.factory,
              customer: header.customer,
              season: header.season,
              po_date: header.po_date,
              etd_pi: header.etd_pi,
              booking: header.booking_date,
              closing: header.closing_date,
              shipping_date: header.shipping_date,
              updated_at: new Date().toISOString(),
            })
            .eq('po', header.po_number);

          if (updateError) throw updateError;
          po_id = existingPO.id;
          actualizados++;
        }

        // 🧾 Insertar líneas del pedido
        if (po_id && lines.length > 0) {
          // Elimina líneas anteriores del mismo PO para reemplazar por las nuevas
          await supabase.from('lineas_pedido').delete().eq('po_id', po_id);

          const formattedLines = lines.map((line: any) => ({
            po_id,
            reference: line.reference,
            style: line.style,
            color: line.color,
            size_run: line.size_run,
            qty: line.qty,
            price: line.price,
            amount: line.amount,
            category: line.category,
            channel: line.channel,
            finish_date: line.finish_date,
            etd: line.etd_pi,
            inspection: line.inspection_approval,
            estado_inspeccion: line.inspection_status,
          }));

          const { error: insertLinesError } = await supabase
            .from('lineas_pedido')
            .insert(formattedLines);

          if (insertLinesError) throw insertLinesError;
        }

        results.push({ po: header.po_number, status: 'ok' });
      } catch (err: any) {
        errores++;
        console.error(`❌ Error al procesar PO ${po.header?.po_number}:`, err);
        results.push({
          po: header.po_number,
          status: 'error',
          message: err.message || 'Error desconocido',
        });
      }
    }

    // 🧩 Resultado final
    const summary = { nuevos, actualizados, errores };
    console.log('✅ Resumen importación:', summary);

    return Response.json(
      { message: 'Importación completada', results, summary },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error general en importación:', error);
    return Response.json(
      { message: error.message || 'Error general en la importación', results: [] },
      { status: 500 }
    );
  }
}
