import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUserAccess } from "@/lib/ownership";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumberOrNull(v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRole(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function getAccessRole(access: unknown) {
  const a = access as any;

  return normalizeRole(
    a?.role ??
      a?.userRole ??
      a?.profile?.role ??
      a?.profile?.user_role ??
      a?.user_profile?.role ??
      a?.tipo_usuario ??
      ""
  );
}

function getAccessEmail(access: unknown) {
  const a = access as any;

  return (
    a?.email ??
    a?.userEmail ??
    a?.user_email ??
    a?.user?.email ??
    a?.profile?.email ??
    a?.user_profile?.email ??
    null
  );
}

function canCreatePrice(role: string, varianteStatus: string | null | undefined) {
  if (role === "ADMIN" || role === "MANAGER") return true;

  if (role === "DESARROLLO") {
    const status = String(varianteStatus ?? "").trim().toLowerCase();
    return status === "inactivo" || status === "inactive";
  }

  return false;
}

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;

    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .select(
        `
        id,
        modelo_id,
        variante_id,
        season,
        currency,
        buy_price,
        sell_price,
        valid_from,
        notes,
        created_at,
        updated_at
      `
      )
      .eq("variante_id", varianteId)
      .order("valid_from", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const varianteId = params.varianteId;

    if (!varianteId) {
      return NextResponse.json({ error: "varianteId is required" }, { status: 400 });
    }

    const access = await getCurrentUserAccess();
    const accessAny = access as any;

    if (!accessAny?.userId || !accessAny?.isActive) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = getAccessRole(access);
    const userEmail = getAccessEmail(access);

    const { data: variante, error: varianteError } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, status")
      .eq("id", varianteId)
      .single();

    if (varianteError || !variante) {
      return NextResponse.json({ error: "Variante no existe" }, { status: 404 });
    }

    if (!canCreatePrice(role, variante.status)) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para crear precios en esta variante. ADMIN y MANAGER pueden modificar precios siempre; DESARROLLO sólo puede hacerlo si la variante está inactiva.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const buy = toNumberOrNull(body?.buy_price);
    if (buy === null) {
      return NextResponse.json(
        { error: "buy_price is required and must be numeric" },
        { status: 400 }
      );
    }

    const sell = toNumberOrNull(body?.sell_price);

    const season = String(body?.season || variante.season || "").trim();
    if (!season) {
      return NextResponse.json({ error: "season is required" }, { status: 400 });
    }

    const currency = String(body?.currency || "USD").trim() || "USD";

    const validFromRaw = String(body?.valid_from || "").trim();
    const valid_from = validFromRaw || todayISODate();

    const notes = body?.notes === "" ? null : body?.notes ?? null;

    const payload = {
      modelo_id: variante.modelo_id,
      variante_id: varianteId,
      season,
      currency,
      buy_price: buy,
      sell_price: sell,
      valid_from,
      notes,
    };

    const { data: precio, error: insertError } = await supabase
      .from("modelo_precios")
      .insert([payload])
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Ya existe un precio para esta variante en esa fecha. Para mantener el histórico, crea el nuevo precio con otra fecha o edita explícitamente el registro existente si corresponde.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: eventError } = await supabase.from("modelo_eventos").insert([
      {
        modelo_id: variante.modelo_id,
        variante_id: varianteId,
        entity_type: "precio",
        event_type: "PRICE_CREATED",
        user_id: accessAny.userId,
        user_email: userEmail,
        source: "api/variantes/precios",
        season,
        payload: {
          price_id: precio.id,
          variante_id: varianteId,
          season,
          currency,
          buy_price: buy,
          sell_price: sell,
          valid_from,
        },
      },
    ]);

    if (eventError) {
      console.error("[MODELO_EVENTOS_PRICE_CREATED]", eventError);
    }

    return NextResponse.json({ status: "ok", precio });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
