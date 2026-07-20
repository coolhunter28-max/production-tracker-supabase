import { createClient } from "@/lib/supabase";

export type ExecutiveAnalysisContextType =
  | "ACTIVE_SEASONS"
  | "SINGLE_SEASON"
  | "HISTORICAL";

export type ExecutiveAnalysisContext = {
  type: ExecutiveAnalysisContextType;

  /**
   * Temporadas incluidas en el contexto.
   *
   * En HISTORICAL permanece vacío porque el contexto
   * incluye expresamente todo el histórico disponible.
   */
  seasons: string[];

  /**
   * Texto comprensible que podrá mostrarse en pantalla.
   */
  label: string;

  /**
   * Indica si el contexto utiliza todo el histórico.
   */
  isHistorical: boolean;
};

export type ResolveExecutiveAnalysisContextOptions = {
  season?: string;
  historical?: boolean;
};

type ActiveSeasonRow = {
  season: string | null;
  is_active: boolean | null;
};

function cleanValue(value?: string): string | null {
  const cleaned = value?.trim();

  return cleaned || null;
}

function uniqueSeasons(seasons: string[]): string[] {
  return Array.from(
    new Set(
      seasons
        .map((season) => season.trim())
        .filter(Boolean)
    )
  );
}

function formatSeasonList(seasons: string[]): string {
  if (seasons.length === 0) {
    return "Sin temporadas activas";
  }

  if (seasons.length === 1) {
    return `Temporada ${seasons[0]}`;
  }

  return seasons.join(" · ");
}

async function getActiveSeasons(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("production_active_seasons")
    .select("season,is_active")
    .eq("is_active", true)
    .order("season", { ascending: true });

  if (error) {
    throw new Error(
      `[getActiveSeasons] No se pudieron cargar las temporadas activas: ${error.message}`
    );
  }

  const rows =
    (data ?? []) as unknown as ActiveSeasonRow[];

  return uniqueSeasons(
    rows
      .map((row) => row.season?.trim() || "")
      .filter(Boolean)
  );
}

/**
 * Resuelve el contexto comercial que debe utilizar Executive.
 *
 * Prioridad:
 *
 * 1. Historical explícito.
 * 2. Temporada concreta explícita.
 * 3. Temporadas activas como contexto por defecto.
 */
export async function resolveExecutiveAnalysisContext(
  options: ResolveExecutiveAnalysisContextOptions = {}
): Promise<ExecutiveAnalysisContext> {
  if (options.historical === true) {
    return {
      type: "HISTORICAL",
      seasons: [],
      label: "Histórico completo",
      isHistorical: true,
    };
  }

  const explicitSeason = cleanValue(options.season);

  if (explicitSeason) {
    return {
      type: "SINGLE_SEASON",
      seasons: [explicitSeason],
      label: `Temporada ${explicitSeason}`,
      isHistorical: false,
    };
  }

  const activeSeasons = await getActiveSeasons();

  return {
    type: "ACTIVE_SEASONS",
    seasons: activeSeasons,
    label: formatSeasonList(activeSeasons),
    isHistorical: false,
  };
}