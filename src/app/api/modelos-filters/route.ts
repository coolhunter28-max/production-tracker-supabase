// src/app/api/modelos-filters/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/modelos-filters -> devuelve listas únicas para dropdowns
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("modelos")
      .select("supplier, customer, factory");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const suppliers = Array.from(
      new Set((data || []).map((r: any) => (r.supplier || "").trim()).filter(Boolean))
    ).sort();

    const customers = Array.from(
      new Set((data || []).map((r: any) => (r.customer || "").trim()).filter(Boolean))
    ).sort();

    const factories = Array.from(
      new Set((data || []).map((r: any) => (r.factory || "").trim()).filter(Boolean))
    ).sort();

    return NextResponse.json({ suppliers, customers, factories });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
