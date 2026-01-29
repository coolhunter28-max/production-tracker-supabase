import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/modelos  -> lista modelos
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("modelos")
      .select("id, style, customer, supplier, status, size_range, factory, updated_at, created_at")
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// POST /api/modelos -> crea modelo
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const style = String(body?.style || "").trim();
    if (!style) {
      return NextResponse.json({ error: "style is required" }, { status: 400 });
    }

    // whitelist campos (para no liarla)
    const allowed = [
      "style",
      "description",
      "supplier",
      "customer",
      "factory",
      "merchandiser_factory",
      "construction",
      "reference",
      "size_range",
      "last_no",
      "last_name",
      "packaging_price",
      "status",
    ] as const;

    const insert: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) insert[k] = body[k] === "" ? null : body[k];
    }

    // Normalización mínima
    insert.style = style;
    if (!insert.reference) insert.reference = style;

    const { data, error } = await supabase
      .from("modelos")
      .insert([insert])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: "ok", modelo: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
