// src/app/api/variantes/[varianteId]/timeline/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUserAccess } from "@/lib/ownership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TimelineDetail = {
  label: string;
  value: string;
};

function text(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function money(value: unknown, currency: unknown) {
  if (value === undefined || value === null || value === "") return "-";

  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);

  return `${n.toFixed(2)} ${text(currency, "")}`.trim();
}

function sourceLabel(source: unknown) {
  const value = String(source ?? "").trim();

  if (value === "cotizacion") return "Cotización";
  if (value === "api/variantes/precios") return "Precios";
  if (value === "api/cotizaciones") return "Cotización";
  if (value === "activate-season") return "Activación temporada";
  if (value === "nuevo-po") return "Nuevo PO";
  if (value === "system") return "Sistema";

  return value || "Sistema";
}

function userLabel(email: unknown, userId: unknown) {
  const emailText = String(email ?? "").trim();
  if (emailText) return emailText;

  const userIdText = String(userId ?? "").trim();
  if (userIdText) return userIdText;

  return "Sistema";
}

function detail(label: string, value: unknown): TimelineDetail {
  return {
    label,
    value: text(value),
  };
}

function formatEvent(row: any) {
  const payload = row?.payload ?? {};
  const eventType = String(row?.event_type ?? "");

  if (eventType === "PRICE_CREATED") {
    return {
      id: row.id,
      created_at: row.created_at,
      icon: "💲",
      title: "Precio creado",
      subtitle: `${money(payload.buy_price, payload.currency)} · válido desde ${text(payload.valid_from)}`,
      user_label: userLabel(row.user_email, row.user_id),
      source_label: sourceLabel(row.source),
      details: [
        detail("Buy", money(payload.buy_price, payload.currency)),
        detail("Sell", money(payload.sell_price, payload.currency)),
        detail("Season", payload.season ?? row.season),
        detail("Valid from", payload.valid_from),
        payload.cotizacion_id ? detail("Cotización", payload.cotizacion_id) : null,
      ].filter(Boolean) as TimelineDetail[],
    };
  }

  if (eventType === "PRICE_UPDATED") {
    const before = payload.before ?? {};
    const after = payload.after ?? {};

    return {
      id: row.id,
      created_at: row.created_at,
      icon: "✏️",
      title: "Precio actualizado",
      subtitle: `${money(before.buy_price, before.currency)} → ${money(after.buy_price, after.currency)}`,
      user_label: userLabel(row.user_email, row.user_id),
      source_label: sourceLabel(row.source),
      details: [
        detail("Antes", `${money(before.buy_price, before.currency)} / Sell ${money(before.sell_price, before.currency)}`),
        detail("Después", `${money(after.buy_price, after.currency)} / Sell ${money(after.sell_price, after.currency)}`),
        detail("Season", payload.season ?? row.season ?? after.season ?? before.season),
        detail("Valid from", after.valid_from ?? before.valid_from),
        detail("Precio ID", payload.price_id),
      ],
    };
  }

  if (eventType === "SEASON_ACTIVATED") {
    return {
      id: row.id,
      created_at: row.created_at,
      icon: "📦",
      title: "Temporada activada",
      subtitle: `${text(payload.source_season)} → ${text(payload.target_season)}`,
      user_label: userLabel(row.user_email, row.user_id),
      source_label: sourceLabel(row.source),
      details: [
        detail("Temporada origen", payload.source_season),
        detail("Temporada destino", payload.target_season ?? row.season),
        detail("Variantes creadas", payload.created_variantes),
        detail("Precios creados", payload.created_precios),
        detail("Componentes creados", payload.created_componentes),
        detail("Imágenes creadas", payload.created_imagenes),
      ],
    };
  }

  return {
    id: row.id,
    created_at: row.created_at,
    icon: "🧾",
    title: eventType || "Evento",
    subtitle: "Movimiento registrado",
    user_label: userLabel(row.user_email, row.user_id),
    source_label: sourceLabel(row.source),
    details: [],
  };
}

function sameText(a: unknown, b: unknown) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

export async function GET(
  _req: Request,
  { params }: { params: { varianteId: string } }
) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.userId || !access.isActive) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const varianteId = String(params?.varianteId ?? "").trim();

    if (!varianteId) {
      return NextResponse.json({ success: false, error: "varianteId es obligatorio" }, { status: 400 });
    }

    const { data: variante, error: varianteError } = await supabase
      .from("modelo_variantes")
      .select("id, modelo_id, season, color, reference, reference_key")
      .eq("id", varianteId)
      .single();

    if (varianteError || !variante) {
      return NextResponse.json(
        { success: false, error: varianteError?.message ?? "Variante no encontrada" },
        { status: 404 }
      );
    }

    // Variante lógica: mismo modelo + color + reference/reference_key.
    // La BD mantiene una fila por season, pero la UI agrupa esas filas como una única variante operativa.
    let logicalVariantIds = [variante.id];
    let logicalSeasons = [String(variante.season ?? "")].filter(Boolean);

    const { data: siblings } = await supabase
      .from("modelo_variantes")
      .select("id, season, color, reference, reference_key")
      .eq("modelo_id", variante.modelo_id)
      .eq("color", variante.color ?? "")
      .eq("reference", variante.reference ?? "");

    if (Array.isArray(siblings) && siblings.length > 0) {
      logicalVariantIds = [...new Set(siblings.map((row: any) => String(row.id)).filter(Boolean))];
      logicalSeasons = [...new Set(siblings.map((row: any) => String(row.season ?? "")).filter(Boolean))];
    }

    const variantIdSet = new Set(logicalVariantIds);
    const seasonSet = new Set(logicalSeasons);

    const { data: rows, error } = await supabase
      .from("modelo_eventos")
      .select("id, modelo_id, variante_id, season, entity_type, event_type, user_id, user_email, source, payload, created_at")
      .eq("modelo_id", variante.modelo_id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[VARIANTE_TIMELINE]", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const filtered = (rows ?? []).filter((row: any) => {
      const payload = row?.payload ?? {};

      // Eventos ligados directamente a cualquiera de las filas físicas de la variante lógica.
      if (row.variante_id && variantIdSet.has(String(row.variante_id))) return true;

      // Eventos antiguos guardaban variante_id sólo dentro del payload.
      if (payload.variante_id && variantIdSet.has(String(payload.variante_id))) return true;

      // Eventos con season indexada.
      if (row.season && seasonSet.has(String(row.season))) {
        if (row.event_type === "SEASON_ACTIVATED") return true;
      }

      // Eventos antiguos de activación de temporada a nivel modelo.
      // Aplican a esta variante lógica si la temporada origen/destino existe entre sus seasons.
      if (row.event_type === "SEASON_ACTIVATED") {
        const sourceSeason = payload.source_season;
        const targetSeason = payload.target_season;

        return (
          (targetSeason && seasonSet.has(String(targetSeason))) ||
          (sourceSeason && seasonSet.has(String(sourceSeason))) ||
          sameText(targetSeason, variante.season) ||
          sameText(sourceSeason, variante.season)
        );
      }

      return false;
    });

    return NextResponse.json({
      success: true,
      data: filtered.map(formatEvent),
      meta: {
        variante_id: varianteId,
        logical_variant_ids: logicalVariantIds,
        logical_seasons: logicalSeasons,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    console.error("[VARIANTE_TIMELINE_FATAL]", error);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
