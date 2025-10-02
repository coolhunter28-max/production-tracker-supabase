import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const { data, error } = await supabase
      .from("alertas")
      .select(`
        id,
        tipo,
        subtipo,
        fecha,
        severidad,
        mensaje,
        po:po_id (
          id,
          po,
          customer
        )
      `)
      .gte("fecha", sevenDaysAgo.toISOString().split("T")[0]) // solo últimos 7 días
      .order("fecha", { ascending: false });

    if (error) {
      console.error("❌ Error cargando alertas:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Error inesperado:", err.message);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
