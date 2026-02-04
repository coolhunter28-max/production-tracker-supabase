// src/app/api/master/variante-precio/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseISODateOrNull(s: string): string | null {
  // Espera YYYY-MM-DD
  const v = (s || "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

/**
 * GET /api/master/variante-precio?variante_id=...&season=...&on=YYYY-MM-DD
 * - season requerido (tu tabla tiene season en precio y en la unique)
 * - on opcional: si no viene, usamos CURRENT_DATE vía fallback simple (hoy)
 *
 * Devuelve:
 *  { found: true, level: "variante"|"modelo", price: {...} }
 *  o { found: false, price: null }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const varianteId = String(searchParams.get("variante_id") || "").trim();
    const season = String(searchParams.get("season") || "").trim();
    const onRaw = String(searchParams.get("on") || "").trim();

    if (!varianteId) {
      return NextResponse.json({ error: "variante_id is required" }, { status: 400 });
    }
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }

    const on = parseISODateOrNull(onRaw);

    // 1) Traer modelo_id de la variante (para fallback base)
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id")
      .eq("id", varianteId)
      .single();

    if (vErr || !variante) {
      return NextResponse.json(
        { error: vErr?.message || "Variante not found" },
        { status: 404 }
      );
    }

    const modeloId = variante.modelo_id;

    // Helper: query builder para "precio vigente"
    const selectFields = "id, currency, buy_price, sell_price, valid_from, notes, modelo_id, variante_id, season";

    // 2) Intentar precio por VARIANTE
    let qVar = supabase
      .from("modelo_precios")
      .select(selectFields)
      .eq("variante_id", varianteId)
      .eq("season", season)
      .order("valid_from", { ascending: false })
      .limit(1);

    if (on) qVar = qVar.lte("valid_from", on);

    const { data: pVar, error: pVarErr } = await qVar;

    if (pVarErr) {
      return NextResponse.json({ error: pVarErr.message }, { status: 500 });
    }

    if (pVar && pVar.length > 0) {
      const p = pVar[0];
      return NextResponse.json({
        found: true,
        level: "variante",
        price: {
          price_id: p.id,
          currency: p.currency,
          buy_price: p.buy_price,
          sell_price: p.sell_price,
          valid_from: p.valid_from,
          season: p.season,
          modelo_id: p.modelo_id,
          variante_id: p.variante_id
        }
      });
    }

    // 3) Fallback: precio BASE por MODELO (variante_id is null)
    let qBase = supabase
      .from("modelo_precios")
      .select(selectFields)
      .eq("modelo_id", modeloId)
      .eq("season", season)
      .is("variante_id", null)
      .order("valid_from", { ascending: false })
      .limit(1);

    if (on) qBase = qBase.lte("valid_from", on);

    const { data: pBase, error: pBaseErr } = await qBase;

    if (pBaseErr) {
      return NextResponse.json({ error: pBaseErr.message }, { status: 500 });
    }

    if (pBase && pBase.length > 0) {
      const p = pBase[0];
      return NextResponse.json({
        found: true,
        level: "modelo",
        price: {
          price_id: p.id,
          currency: p.currency,
          buy_price: p.buy_price,
          sell_price: p.sell_price,
          valid_from: p.valid_from,
          season: p.season,
          modelo_id: p.modelo_id,
          variante_id: null
        }
      });
    }

    return NextResponse.json({ found: false, level: null, price: null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
