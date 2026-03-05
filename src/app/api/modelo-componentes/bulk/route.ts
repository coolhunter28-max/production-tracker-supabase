import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_KINDS = ["upper", "lining", "insole", "shoelace", "outsole", "packaging", "other"] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

function asString(v: any) {
  return v === undefined || v === null ? "" : String(v);
}

function fmtPart(comp: any) {
  const material = asString(comp.material_text).trim();
  const quality = asString(comp.quality).trim();
  const extra = asString(comp.extra).trim();

  const pct =
    comp.percentage !== undefined && comp.percentage !== null && Number.isFinite(Number(comp.percentage))
      ? Number(comp.percentage)
      : null;

  const head = [quality, material].filter(Boolean).join(" ");
  const pctStr = pct !== null ? ` (${pct}%)` : "";
  const extraStr = extra ? ` · ${extra}` : "";
  return (head || "-") + pctStr + extraStr;
}

function buildKindMap(list: any[]) {
  const kindMap = new Map<Kind, any[]>();
  for (const k of ALLOWED_KINDS) kindMap.set(k, []);

  for (const c of list) {
    const kind = String(c.kind || "").trim() as Kind;
    if (!ALLOWED_KINDS.includes(kind)) continue;
    kindMap.get(kind)!.push(c);
  }

  for (const k of ALLOWED_KINDS) {
    kindMap.get(k)!.sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
  }

  return kindMap;
}

// GET /api/modelo-componentes/bulk?variante_ids=uuid,uuid,uuid
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = String(searchParams.get("variante_ids") || "").trim();

    if (!raw) return NextResponse.json({ error: "variante_ids is required" }, { status: 400 });

    const varianteIds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (varianteIds.length === 0) return NextResponse.json({ error: "variante_ids empty" }, { status: 400 });
    if (varianteIds.length > 300) {
      return NextResponse.json({ error: "Too many variante_ids (max 300)" }, { status: 400 });
    }

    // 1) Map variante -> modelo (para fallback)
    const { data: variantes, error: vErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id")
      .in("id", varianteIds);

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    const varianteToModelo = new Map<string, string>();
    const modeloIds: string[] = [];
    for (const v of variantes || []) {
      if (v?.id && v?.modelo_id) {
        varianteToModelo.set(v.id, v.modelo_id);
        modeloIds.push(v.modelo_id);
      }
    }
    const uniqueModeloIds = Array.from(new Set(modeloIds));

    // 2) Componentes por variante
    const { data: compsVar, error: cVErr } = await supabase
      .from("modelo_componentes")
      .select("modelo_id, variante_id, kind, slot, percentage, quality, material_text, extra")
      .in("variante_id", varianteIds);

    if (cVErr) return NextResponse.json({ error: cVErr.message }, { status: 500 });

    // 3) Componentes base por modelo (variante_id IS NULL)
    let compsBase: any[] = [];
    if (uniqueModeloIds.length > 0) {
      const { data: cB, error: cBErr } = await supabase
        .from("modelo_componentes")
        .select("modelo_id, variante_id, kind, slot, percentage, quality, material_text, extra")
        .is("variante_id", null)
        .in("modelo_id", uniqueModeloIds);

      if (cBErr) return NextResponse.json({ error: cBErr.message }, { status: 500 });
      compsBase = cB || [];
    }

    // Index base por modelo_id
    const baseBucket = new Map<string, any[]>();
    for (const c of compsBase) {
      const mid = String(c.modelo_id || "");
      if (!mid) continue;
      if (!baseBucket.has(mid)) baseBucket.set(mid, []);
      baseBucket.get(mid)!.push(c);
    }
    const baseByModelo = new Map<string, Map<Kind, any[]>>();
    for (const [mid, list] of baseBucket.entries()) {
      baseByModelo.set(mid, buildKindMap(list));
    }

    // Index variante por variante_id
    const varBucket = new Map<string, any[]>();
    for (const c of compsVar || []) {
      const vid = String(c.variante_id || "");
      if (!vid) continue;
      if (!varBucket.has(vid)) varBucket.set(vid, []);
      varBucket.get(vid)!.push(c);
    }
    const varByVariante = new Map<string, Map<Kind, any[]>>();
    for (const [vid, list] of varBucket.entries()) {
      varByVariante.set(vid, buildKindMap(list));
    }

    // 4) Respuesta final por variante (variante > base > none)
    const out: Record<
      string,
      { source: "variante" | "base" | "none"; kinds: Record<string, string> }
    > = {};

    for (const vid of varianteIds) {
      const vMap = varByVariante.get(vid);
      const mid = varianteToModelo.get(vid);

      const hasVar = vMap ? ALLOWED_KINDS.some((k) => (vMap.get(k)?.length || 0) > 0) : false;

      let chosen: Map<Kind, any[]> | undefined;
      let source: "variante" | "base" | "none" = "none";

      if (hasVar && vMap) {
        chosen = vMap;
        source = "variante";
      } else if (mid && baseByModelo.get(mid)) {
        chosen = baseByModelo.get(mid);
        source = "base";
      }

      const kinds: Record<string, string> = {};
      for (const k of ALLOWED_KINDS) {
        const arr = chosen?.get(k) || [];
        kinds[k] = arr.length ? arr.map(fmtPart).join(" / ") : "";
      }

      out[vid] = { source, kinds };
    }

    return NextResponse.json({ data: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}