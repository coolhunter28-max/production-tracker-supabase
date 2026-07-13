// src/app/api/modelos/[id]/timeline/route.ts
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
  if (value === "nuevo_po") return "Nuevo PO";
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

function variantLabel(row: any, variantMap: Map<string, any>) {
  const variantId = String(row?.variante_id ?? row?.payload?.variante_id ?? "").trim();
  if (!variantId) return null;

  const variante = variantMap.get(variantId);
  if (!variante) return null;

  const parts = [
    variante.season,
    variante.color,
    variante.reference ? `Ref ${variante.reference}` : null,
  ].filter(Boolean);

  return parts.join(" · ") || null;
}

function formatEvent(row: any, variantMap: Map<string, any>) {
  const payload = row?.payload ?? {};
  const eventType = String(row?.event_type ?? "");
  const variant_label = variantLabel(row, variantMap);

  if (eventType === "PRICE_CREATED") {
    return {
      id: row.id,
      created_at: row.created_at,
      icon: "💲",
      title: "Precio creado",
      subtitle: `${money(payload.buy_price, payload.currency)} · válido desde ${text(payload.valid_from)}`,
      user_label: userLabel(row.user_email, row.user_id),
      source_label: sourceLabel(row.source),
      variant_label,
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
      variant_label,
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
      variant_label,
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
    variant_label,
    details: [],
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const access = await getCurrentUserAccess();

    if (!access.userId || !access.isActive) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const modeloId = String(params?.id ?? "").trim();

    if (!modeloId) {
      return NextResponse.json({ success: false, error: "modelo id es obligatorio" }, { status: 400 });
    }

    const { data: modelo, error: modeloError } = await supabase
      .from("modelos")
      .select("id")
      .eq("id", modeloId)
      .single();

    if (modeloError || !modelo) {
      return NextResponse.json(
        { success: false, error: modeloError?.message ?? "Modelo no encontrado" },
        { status: 404 }
      );
    }

    const { data: variantes } = await supabase
      .from("modelo_variantes")
      .select("id, season, color, reference")
      .eq("modelo_id", modeloId);

    const variantMap = new Map<string, any>(
      (variantes ?? []).map((v: any) => [String(v.id), v])
    );

    const { data: rows, error } = await supabase
      .from("modelo_eventos")
      .select("id, modelo_id, variante_id, season, entity_type, event_type, user_id, user_email, source, payload, created_at")
      .eq("modelo_id", modeloId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[MODELO_TIMELINE]", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: (rows ?? []).map((row: any) => formatEvent(row, variantMap)),
      meta: {
        modelo_id: modeloId,
        count: rows?.length ?? 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    console.error("[MODELO_TIMELINE_FATAL]", error);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
