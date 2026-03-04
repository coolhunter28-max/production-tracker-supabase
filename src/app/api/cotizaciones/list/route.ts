import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/cotizaciones/list?q=...&customer=...&season=...&status=...&limit=50&offset=0
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = String(searchParams.get("q") || "").trim();
    const customer = String(searchParams.get("customer") || "").trim();
    const season = String(searchParams.get("season") || "").trim();
    const status = String(searchParams.get("status") || "").trim();

    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");

    let limit = 50;
    let offset = 0;

    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) limit = Math.floor(n);
    }
    if (offsetRaw) {
      const n = Number(offsetRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) offset = Math.floor(n);
    }

    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;
    if (offset < 0) offset = 0;

    let query = supabase
      .from("cotizaciones")
      .select(
        `
        id,
        modelo_id,
        variante_id,
        currency,
        buy_price,
        sell_price,
        margin_pct,
        commission_enabled,
        commission_rate,
        rounding_step,
        status,
        notes,
        created_by,
        created_at,
        modelos: modelos (
          id,
          style,
          reference,
          customer,
          size_range,
          picture_url
        ),
        modelo_variantes: modelo_variantes (
          id,
          season,
          color,
          reference
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // filtros directos
    if (customer) query = query.eq("modelos.customer", customer);
    if (season) query = query.eq("modelo_variantes.season", season);
    if (status) query = query.eq("status", status);

    // búsqueda por style/reference (dos pasos para ser robustos)
    if (q) {
      const { data: modelosMatch, error: mErr } = await supabase
        .from("modelos")
        .select("id")
        .or(`style.ilike.%${q}%,reference.ilike.%${q}%`)
        .limit(500);

      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

      const ids = (modelosMatch || []).map((r: any) => r.id);
      if (ids.length === 0) {
        return NextResponse.json({ data: [], count: 0, limit, offset });
      }
      query = query.in("modelo_id", ids);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows: any[] = Array.isArray(data) ? data : [];

    // ============================
    // ✅ FIX 1: Rellenar modelo_variantes si viene null
    // ============================
    const varianteIds = Array.from(
      new Set(rows.map((r) => r?.variante_id).filter((v) => typeof v === "string" && v.length > 0))
    );

    let variantesMap = new Map<string, any>();
    if (varianteIds.length > 0) {
      const { data: variantes, error: vErr } = await supabase
        .from("modelo_variantes")
        .select("id, season, color, reference")
        .in("id", varianteIds);

      if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

      for (const v of variantes || []) variantesMap.set(v.id, v);
    }

    // ============================
    // ✅ FIX 2: Fallback de size_range desde lineas_pedido.size_run (solo lectura)
    // Prioridad: variante_id → modelo_id
    // ============================
    const modeloIds = Array.from(
      new Set(rows.map((r) => r?.modelo_id).filter((v) => typeof v === "string" && v.length > 0))
    );

    const sizeByVariante = new Map<string, string>();
    const sizeByModelo = new Map<string, string>();

    // 2A) size_run por variante_id (más preciso)
    if (varianteIds.length > 0) {
      const { data: lpV, error: lpVErr } = await supabase
        .from("lineas_pedido")
        .select("variante_id, size_run, updated_at, created_at")
        .in("variante_id", varianteIds)
        .not("size_run", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1500);

      if (lpVErr) return NextResponse.json({ error: lpVErr.message }, { status: 500 });

      for (const r of lpV || []) {
        const vid = r.variante_id;
        const sr = r.size_run;
        if (vid && sr && !sizeByVariante.has(vid)) sizeByVariante.set(vid, sr);
      }
    }

    // 2B) size_run por modelo_id (fallback)
    if (modeloIds.length > 0) {
      const { data: lpM, error: lpMErr } = await supabase
        .from("lineas_pedido")
        .select("modelo_id, size_run, updated_at, created_at")
        .in("modelo_id", modeloIds)
        .not("size_run", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1500);

      if (lpMErr) return NextResponse.json({ error: lpMErr.message }, { status: 500 });

      for (const r of lpM || []) {
        const mid = r.modelo_id;
        const sr = r.size_run;
        if (mid && sr && !sizeByModelo.has(mid)) sizeByModelo.set(mid, sr);
      }
    }

    // Aplicar enriquecimiento
    const enriched = rows.map((r) => {
      const vid = r?.variante_id;
      const mid = r?.modelo_id;

      // 1) modelo_variantes: si viene null, lo rellenamos
      const mv = r?.modelo_variantes ?? (vid ? variantesMap.get(vid) ?? null : null);

      // 2) size_range: si modelos.size_range es null, usamos size_run
      const modelosObj = r?.modelos ? { ...r.modelos } : null;
      if (modelosObj && (modelosObj.size_range === null || modelosObj.size_range === undefined || modelosObj.size_range === "")) {
        const byVar = vid ? sizeByVariante.get(vid) : null;
        const byMod = mid ? sizeByModelo.get(mid) : null;
        modelosObj.size_range = byVar || byMod || null;
      }

      return {
        ...r,
        modelos: modelosObj,
        modelo_variantes: mv,
      };
    });

    return NextResponse.json({
      data: enriched,
      count: count ?? 0,
      limit,
      offset,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}