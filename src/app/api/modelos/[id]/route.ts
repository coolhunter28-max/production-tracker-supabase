// src/app/api/modelos/[id]/route.ts
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
  const { data, error } = await supabase
    .from("modelos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // ✅ whitelist de campos editables (para no liarla)
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

    const updates: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k] === "" ? null : body[k];
    }

    const { data, error } = await supabase
      .from("modelos")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", modelo: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
