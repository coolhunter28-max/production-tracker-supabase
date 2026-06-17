import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  console.log("📢 Generando alertas...");

  try {
    const supabase = await createClient();

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sin detalles adicionales.";

    console.error("💥 Error inesperado:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al generar alertas.",
        details: message,
      },
      { status: 500 }
    );
  }
}