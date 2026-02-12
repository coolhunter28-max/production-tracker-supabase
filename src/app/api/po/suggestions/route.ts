// src/app/api/po/suggestions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function uniqSorted(values: Array<string | null | undefined>, limit: number) {
  const set = new Set<string>();
  for (const v of values) {
    const s = (v ?? "").toString().trim();
    if (!s) continue;
    set.add(s);
    if (set.size >= limit) break;
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// GET /api/po/suggestions?customer=...&supplier=...&factory=...&q=...&limit=200
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const customer = String(searchParams.get("customer") || "").trim();
    const supplier = String(searchParams.get("supplier") || "").trim();
    const factory = String(searchParams.get("factory") || "").trim();
    const q = String(searchParams.get("q") || "").trim();

    let limit = Number(searchParams.get("limit") || 200);
    if (!Number.isFinite(limit) || limit < 20) limit = 200;
    if (limit > 1000) limit = 1000;

    // -------------------------
    // 1) Sugerencias cabecera: customer/supplier/factory desde "pos"
    // -------------------------
    let posQuery = supabase
      .from("pos")
      .select("customer, supplier, factory")
      .order("updated_at", { ascending: false })
      .limit(2000);

    if (customer) posQuery = posQuery.eq("customer", customer);
    if (supplier) posQuery = posQuery.eq("supplier", supplier);
    if (factory) posQuery = posQuery.eq("factory", factory);

    // q: si viene, lo usamos como filtro amplio (OR) sobre cabecera
    if (q) {
      // postgrest or: campo.ilike.%q%
      posQuery = posQuery.or(
        `customer.ilike.%${q}%,supplier.ilike.%${q}%,factory.ilike.%${q}%`
      );
    }

    const { data: posRows, error: posErr } = await posQuery;
    if (posErr) throw posErr;

    const customers = uniqSorted(posRows?.map((r) => r.customer), limit);
    const suppliers = uniqSorted(posRows?.map((r) => r.supplier), limit);
    const factories = uniqSorted(posRows?.map((r) => r.factory), limit);

    // -------------------------
    // 2) Sugerencias de línea: size/category/channel desde "lineas_pedido"
    //    Filtradas por customer/supplier/factory via join con pos (inner)
    // -------------------------
    let lineQuery = supabase
      .from("lineas_pedido")
      .select("size_run, category, channel, pos!inner(customer, supplier, factory)")
      .order("updated_at", { ascending: false })
      .limit(3000);

    if (customer) lineQuery = lineQuery.eq("pos.customer", customer);
    if (supplier) lineQuery = lineQuery.eq("pos.supplier", supplier);
    if (factory) lineQuery = lineQuery.eq("pos.factory", factory);

    // q: filtro amplio sobre size/category/channel
    if (q) {
      lineQuery = lineQuery.or(
        `size_run.ilike.%${q}%,category.ilike.%${q}%,channel.ilike.%${q}%`
      );
    }

    const { data: lineRows, error: lineErr } = await lineQuery;
    if (lineErr) throw lineErr;

    const sizes = uniqSorted(lineRows?.map((r: any) => r.size_run), limit);
    const categories = uniqSorted(lineRows?.map((r: any) => r.category), limit);
    const channels = uniqSorted(lineRows?.map((r: any) => r.channel), limit);

    return NextResponse.json({
      ok: true,
      data: {
        customers,
        suppliers,
        factories,
        sizes,
        categories,
        channels,
      },
    });
  } catch (e: any) {
    console.error("❌ /api/po/suggestions error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
