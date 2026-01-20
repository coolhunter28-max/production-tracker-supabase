// src/app/api/modelos/[id]/imagenes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const modeloId = params.id;
    if (!modeloId) {
      return NextResponse.json({ error: "Missing modelo id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_imagenes")
      .select("id, modelo_id, public_url, file_key, kind, size_bytes, created_at, sort_order")
      .eq("modelo_id", modeloId)
      .order("kind", { ascending: true }) // main primero (main < gallery)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
