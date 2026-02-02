// src/app/api/variantes/[varianteId]/imagenes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;
    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    // Validar que exista variante (opcional pero recomendable)
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id")
      .eq("id", varianteId)
      .single();

    if (vErr || !variante) {
      return NextResponse.json({ error: "Variante no existe" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("modelo_imagenes")
      .select("id, modelo_id, variante_id, public_url, file_key, kind, size_bytes, mime_type, created_at")
      .eq("variante_id", varianteId)
      .order("kind", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
