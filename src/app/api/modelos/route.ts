// src/app/api/modelos/route.ts
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
      .select(
        "id, style, customer, supplier, status, size_range, factory, updated_at, created_at"
      )
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// POST /api/modelos -> crea modelo (+ primera variante)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const style = String(body?.style || "").trim();
    if (!style) {
      return NextResponse.json({ error: "style is required" }, { status: 400 });
    }

    // ✅ Primera variante: season obligatorio
    const firstSeason = String(body?.first_season || "").trim();
    if (!firstSeason) {
      return NextResponse.json(
        { error: "first_season is required (para crear la primera variante)" },
        { status: 400 }
      );
    }

    // Color opcional -> si viene vacío, usamos BASE para evitar NULLs repetibles
    const firstColorRaw = body?.first_color;
    const firstColor =
      firstColorRaw === undefined || firstColorRaw === null
        ? "BASE"
        : String(firstColorRaw || "").trim() || "BASE";

    const firstFactory =
      body?.first_factory !== undefined ? String(body.first_factory || "").trim() : "";

    const firstStatus =
      body?.first_status !== undefined ? String(body.first_status || "").trim() : "activo";

    const firstNotes =
      body?.first_notes !== undefined ? String(body.first_notes || "").trim() : "";

    // whitelist campos modelo (para no liarla)
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

    // 1) Insert MODELO
    const { data: modelo, error: mErr } = await supabase
      .from("modelos")
      .insert([insert])
      .select("*")
      .single();

    if (mErr || !modelo) {
      return NextResponse.json({ error: mErr?.message || "Error creando modelo" }, { status: 500 });
    }

    // 2) Insert PRIMERA VARIANTE (siempre)
    const { data: variante, error: vErr } = await supabase
      .from("modelo_variantes")
      .insert([
        {
          modelo_id: modelo.id,
          season: firstSeason,
          color: firstColor, // "BASE" si no hay color
          factory: firstFactory ? firstFactory : null,
          status: firstStatus || "activo",
          notes: firstNotes ? firstNotes : null,
        },
      ])
      .select("*")
      .single();

    if (vErr || !variante) {
      // 🔥 Importante: no podemos “rollback” sin RPC/transaction, pero al menos devolvemos info clara
      return NextResponse.json(
        {
          error:
            "Modelo creado, pero falló la creación de la primera variante: " +
            (vErr?.message || "unknown"),
          modelo,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok", modelo, first_variante: variante });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
