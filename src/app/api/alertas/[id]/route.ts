import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("alertas")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("❌ Error cargando alerta:", error.message);
      return jsonError(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("❌ Error inesperado:", message);
    return jsonError(message);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { error } = await supabase
      .from("alertas")
      .update(body)
      .eq("id", params.id);

    if (error) {
      console.error("❌ Error actualizando alerta:", error.message);
      return jsonError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("❌ Error inesperado:", message);
    return jsonError(message);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("alertas")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("❌ Error eliminando alerta:", error.message);
      return jsonError(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("❌ Error inesperado:", message);
    return jsonError(message);
  }
}