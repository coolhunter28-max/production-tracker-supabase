import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sourceVarianteId = String(body?.sourceVarianteId || "").trim();
    const targetVarianteIds: string[] = Array.isArray(body?.targetVarianteIds)
      ? body.targetVarianteIds
      : [];

    const copyComponentes = !!body?.copy?.componentes;
    const copyPrecios = !!body?.copy?.precios;

    if (!sourceVarianteId || targetVarianteIds.length === 0) {
      return NextResponse.json(
        { error: "sourceVarianteId y targetVarianteIds son obligatorios" },
        { status: 400 }
      );
    }

    if (!copyComponentes && !copyPrecios) {
      return NextResponse.json(
        { error: "Debes elegir algo a copiar (componentes y/o precios)" },
        { status: 400 }
      );
    }

    // 1) Cargar variante origen
    const { data: source, error: sErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id")
      .eq("id", sourceVarianteId)
      .single();

    if (sErr || !source) {
      return NextResponse.json(
        { error: "Variante origen no existe" },
        { status: 404 }
      );
    }

    // 2) Cargar variantes destino y validar mismo modelo
    const { data: targets, error: tErr } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id")
      .in("id", targetVarianteIds);

    if (tErr || !targets || targets.length !== targetVarianteIds.length) {
      return NextResponse.json(
        { error: "Alguna variante destino no existe" },
        { status: 400 }
      );
    }

    for (const t of targets) {
      if (t.modelo_id !== source.modelo_id) {
        return NextResponse.json(
          { error: "Todas las variantes deben ser del mismo modelo" },
          { status: 400 }
        );
      }
    }

    const report: any = {
      componentes: { copied: 0, skipped: 0 },
      precios: { copied: 0, skipped: 0 },
    };

    // ---------------- COMPONENTES ----------------
    if (copyComponentes) {
      const { data: comps } = await supabase
        .from("modelo_componentes")
        .select("*")
        .eq("variante_id", sourceVarianteId);

      for (const targetId of targetVarianteIds) {
        for (const c of comps || []) {
          const { error } = await supabase.from("modelo_componentes").insert([
            {
              modelo_id: c.modelo_id,
              variante_id: targetId,
              kind: c.kind,
              slot: c.slot,
              catalogo_id: c.catalogo_id,
              percentage: c.percentage,
              quality: c.quality,
              material_text: c.material_text,
              extra: c.extra,
            },
          ]);

          if (error) {
            // unique (variante_id, kind, slot) → skip
            report.componentes.skipped++;
          } else {
            report.componentes.copied++;
          }
        }
      }
    }

    // ---------------- PRECIOS ----------------
    if (copyPrecios) {
      const { data: prices } = await supabase
        .from("modelo_precios")
        .select("*")
        .eq("variante_id", sourceVarianteId);

      for (const targetId of targetVarianteIds) {
        for (const p of prices || []) {
          const { error } = await supabase.from("modelo_precios").insert([
            {
              modelo_id: p.modelo_id,
              variante_id: targetId,
              season: p.season,
              currency: p.currency,
              buy_price: p.buy_price,
              sell_price: p.sell_price,
              valid_from: p.valid_from,
              notes: p.notes,
            },
          ]);

          if (error) {
            // unique (variante_id, valid_from)
            report.precios.skipped++;
          } else {
            report.precios.copied++;
          }
        }
      }
    }

    return NextResponse.json({ status: "ok", report });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
