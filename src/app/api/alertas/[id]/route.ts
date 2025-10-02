import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const { data, error } = await supabase
      .from("po")
      .select(`
        *,
        lineas_pedido (
          *,
          muestras (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Error cargando PO:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ Error inesperado:", err.message);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  try {
    const { error } = await supabase
      .from("po")
      .update(body)
      .eq("id", id);

    if (error) {
      console.error("❌ Error actualizando PO:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err.message);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const { error } = await supabase.from("po").delete().eq("id", id);

    if (error) {
      console.error("❌ Error eliminando PO:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error inesperado:", err.message);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
