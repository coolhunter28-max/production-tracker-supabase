// src/app/api/master/modelos/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/master/modelos?q=...&limit=...
 * - q: filtro por style (ILIKE)
 * - limit: default 50, max 200
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const qRaw = searchParams.get("q");
    const q = qRaw ? String(qRaw).trim() : "";

    const limitRaw = searchParams.get("limit");
    let limit = 50;
    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) limit = Math.floor(n);
    }
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;

    let query = supabase
      .from("modelos")
      .select("id, style, reference, factory, supplier, customer, status, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (q) {
      // Busca por style y reference (si la usas como alias)
      // Nota: ilike necesita %...%
      query = query.or(`style.ilike.%${q}%,reference.ilike.%${q}%`);
    }

    const { data, error } = await query;

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
