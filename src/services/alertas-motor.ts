// src/services/alertas-motor.ts

import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

type Alerta = {
  id: string;
  tipo: string;
  subtipo: string;
  severidad: string;
  mensaje: string;
  fecha: Date | null;
  fecha_limite: Date | null;
  es_estimada: boolean;
  po_id: string;
  linea_id: string;
  muestra_id?: string;
  leida: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function generarAlertas() {
  // 1. Obtener muestras con relaciones
  const { data: muestras, error } = await supabase
    .from("muestras")
    .select(
      `
      id,
      tipo_muestra,
      fecha_muestra,
      fecha_teorica,
      linea_pedido_id,
      lineas_pedido (
        id,
        style,
        color,
        po_id,
        pos (
          id,
          po,
          customer,
          supplier,
          po_date,
          shipping_date
        )
      )
    `
    );

  if (error) {
    console.error("Error obteniendo muestras:", error);
    throw error;
  }

  if (!muestras || muestras.length === 0) {
    console.log("No hay muestras para procesar");
    return [];
  }

  const alertas: Alerta[] = [];

  for (const muestra of muestras) {
    const po = muestra.lineas_pedido?.pos;
    const linea = muestra.lineas_pedido;

    if (!po || !linea) continue;

    // ✅ Convertimos fechas string → Date
    const fechaMuestra = muestra.fecha_muestra
      ? new Date(muestra.fecha_muestra)
      : null;
    const fechaTeorica = muestra.fecha_teorica
      ? new Date(muestra.fecha_teorica)
      : null;

    // Prioridad: fecha_muestra > fecha_teorica
    const fechaBase: Date | null = fechaMuestra ?? fechaTeorica;

    if (!fechaBase) continue; // si no hay fecha, no generamos alerta

    // Severidad según atraso
    const hoy = new Date();
    let severidad: "alta" | "media" | "baja" = "baja";
    if (fechaBase < hoy) severidad = "alta";

    // Mensaje de alerta
    const mensaje = `PO ${po.po} - ${po.customer} - ${linea.style} ${linea.color} | Muestra: ${muestra.tipo_muestra} (${fechaBase.toISOString().split("T")[0]})`;

    const alerta: Alerta = {
      id: uuidv4(),
      tipo: "muestra",
      subtipo: muestra.tipo_muestra,
      severidad,
      mensaje,
      fecha: hoy,
      fecha_limite: fechaBase,
      es_estimada: !fechaMuestra, // true si usamos fecha_teorica
      po_id: po.id,
      linea_id: linea.id,
      muestra_id: muestra.id,
      leida: false,
      created_at: hoy,
      updated_at: hoy,
    };

    alertas.push(alerta);
  }

  // 2. Limpiar alertas previas de muestras
  const { error: delError } = await supabase
    .from("alertas")
    .delete()
    .eq("tipo", "muestra");

  if (delError) {
    console.error("Error eliminando alertas previas:", delError);
    throw delError;
  }

  // 3. Insertar nuevas alertas
  if (alertas.length > 0) {
    const { error: insertError } = await supabase
      .from("alertas")
      .insert(alertas);

    if (insertError) {
      console.error("Error insertando alertas:", insertError);
      throw insertError;
    }
  }

  console.log(`✅ Se generaron ${alertas.length} alertas nuevas`);
  return alertas;
}
