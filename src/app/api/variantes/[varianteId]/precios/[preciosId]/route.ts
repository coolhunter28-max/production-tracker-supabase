// src/app/api/variantes/[varianteId]/precios/[precioId]/route.ts
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

function canUpdatePrice(role: string, varianteStatus: string | null | undefined) {
  if (role === "ADMIN" || role === "MANAGER") return true;

  if (role === "DESARROLLO") {
    const status = String(varianteStatus ?? "").trim().toLowerCase();
    return status === "inactivo" || status === "inactive";
  }

  return false;
}

function normalizePriceForPayload(price: any) {
  if (!price) return null;

  return {
    id: price.id ?? null,
    modelo_id: price.modelo_id ?? null,
    variante_id: price.variante_id ?? null,
    season: price.season ?? null,
    currency: price.currency ?? null,
    buy_price: price.buy_price ?? null,
    sell_price: price.sell_price ?? null,
    valid_from: price.valid_from ?? null,
    notes: price.notes ?? null,
    category: price.category ?? null,
    size_run: price.size_run ?? null,
    channel: price.channel ?? null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  try {
    const { varianteId, precioId } = params;

    if (!varianteId || !precioId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("modelo_precios")
      .select("*")
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  try {
    const { varianteId, precioId } = params;

    if (!varianteId || !precioId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
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

    if (!canUpdatePrice(role, variante.status)) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar precios en esta variante. ADMIN y MANAGER pueden modificar precios siempre; DESARROLLO sólo puede hacerlo si la variante está inactiva.",
        },
        { status: 403 }
      );
    }

    const { data: before, error: beforeError } = await supabase
      .from("modelo_precios")
      .select("*")
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .single();

    if (beforeError || !before) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
    }

    const body = await req.json();

    const allowed = [
      "season",
      "currency",
      "buy_price",
      "sell_price",
      "valid_from",
      "notes",
      "category",
      "size_run",
      "channel",
    ] as const;

    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body?.[key] !== undefined) {
        updates[key] = body[key] === "" ? null : body[key];
      }
    }

    if (updates.buy_price !== undefined) {
      const buy = toNumberOrNull(updates.buy_price);

      if (buy === null) {
        return NextResponse.json({ error: "buy_price must be numeric" }, { status: 400 });
      }

      updates.buy_price = buy;
    }

    if (updates.sell_price !== undefined) {
      updates.sell_price = toNumberOrNull(updates.sell_price);
    }

    if (updates.season !== undefined) {
      const season = String(updates.season ?? "").trim();

      if (!season) {
        return NextResponse.json({ error: "season is required" }, { status: 400 });
      }

      updates.season = season;
    }

    if (updates.currency !== undefined) {
      updates.currency = String(updates.currency ?? "USD").trim() || "USD";
    }

    if (updates.valid_from !== undefined && updates.valid_from !== null) {
      const validFrom = String(updates.valid_from).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
        return NextResponse.json({ error: "valid_from must be YYYY-MM-DD" }, { status: 400 });
      }

      updates.valid_from = validFrom;
    }

    if (updates.notes !== undefined) {
      updates.notes = updates.notes === null ? null : String(updates.notes);
    }

    if (updates.category !== undefined) {
      updates.category = updates.category === null ? null : String(updates.category).trim() || null;
    }

    if (updates.size_run !== undefined) {
      updates.size_run = updates.size_run === null ? null : String(updates.size_run).trim() || null;
    }

    if (updates.channel !== undefined) {
      updates.channel = updates.channel === null ? null : String(updates.channel).trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: precio, error: updateError } = await supabase
      .from("modelo_precios")
      .update(updates)
      .eq("id", precioId)
      .eq("variante_id", varianteId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: eventError } = await supabase.from("modelo_eventos").insert([
      {
        modelo_id: variante.modelo_id,
        variante_id: varianteId,
        entity_type: "precio",
        event_type: "PRICE_UPDATED",
        user_id: accessAny.userId,
        user_email: userEmail,
        source: "api/variantes/precios/[precioId]",
        payload: {
          price_id: precio.id,
          variante_id: varianteId,
          before: normalizePriceForPayload(before),
          after: normalizePriceForPayload(precio),
          changed_fields: Object.keys(updates),
        },
      },
    ]);

    if (eventError) {
      console.error("[MODELO_EVENTOS_PRICE_UPDATED]", eventError);
    }

    return NextResponse.json({ status: "ok", precio });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { varianteId: string; precioId: string } }
) {
  const { varianteId, precioId } = params;

  console.warn("[PRICE_DELETE_BLOCKED]", {
    varianteId,
    precioId,
    reason: "modelo_precios is historical and should not be deleted from the UI",
  });

  return NextResponse.json(
    {
      error:
        "No se permite borrar precios históricos. Crea un nuevo precio con una fecha vigente o solicita una corrección administrativa.",
    },
    { status: 405 }
  );
}
