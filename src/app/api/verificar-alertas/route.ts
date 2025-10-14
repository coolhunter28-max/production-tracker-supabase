import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  console.log("📢 Generando alertas...");

  try {
    const { data, error } = await supabase.rpc("generar_alertas");

    if (error) {
      console.error("❌ Error al ejecutar función generar_alertas:", error.message);
      return NextResponse.json(
        {
          ok: false,
          message: "Error al generar alertas.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Alertas generadas o actualizadas correctamente.");
    return NextResponse.json(
      {
        ok: true,
        message: "✅ Alertas generadas o actualizadas correctamente.",
        data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("💥 Error inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al generar alertas.",
        details: err.message || "Sin detalles adicionales.",
      },
      { status: 500 }
    );
  }
}
