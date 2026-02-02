import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/modelos/:id/imagenes
// -> devuelve SOLO imágenes del MODELO (variante_id IS NULL)
// (main + cualquier otra que decidas meter a nivel modelo)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modeloId = params.id;
    if (!modeloId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_imagenes")
      .select("id, modelo_id, variante_id, public_url, file_key, kind, size_bytes, created_at")
      .eq("modelo_id", modeloId)
      .is("variante_id", null)
      .order("kind", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
