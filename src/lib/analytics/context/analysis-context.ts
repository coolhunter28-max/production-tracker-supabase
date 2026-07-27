import { createClient } from "@/lib/supabase";

export type AnalysisContextType =
  | "ACTIVE_SEASONS"
  | "SINGLE_SEASON"
  | "COMPARATIVE_SEASONS"
  | "HISTORICAL";

export type AnalysisContext = {
  type: AnalysisContextType;

  /**
   * Temporadas principales incluidas en el análisis.
   *
   * En HISTORICAL permanece vacío porque el contexto
   * incluye todo el histórico disponible.
   */
  seasons: string[];

  /**
   * Temporadas utilizadas como referencia comparativa.
   *
   * Solo contiene valores en COMPARATIVE_SEASONS.
   */
  comparisonSeasons: string[];

  label: string;
  isHistorical: boolean;
};

export type ResolveAnalysisContextOptions = {
  season?: string;
  historical?: boolean;

  /**
   * Compara la temporada indicada con su campaña hermana
   * del mismo tipo comercial y del año anterior.
   *
   * Requiere una temporada explícita.
   */
  compareWithPreviousSister?: boolean;
};

type ActiveSeasonRow = {
  season: string | null;
  is_active: boolean | null;
};

type CommercialSeasonRow = {
  season: string | null;
  previous_sister_season: string | null;
  display_name: string | null;
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

  const rows = (data ?? []) as unknown as ActiveSeasonRow[];

  return uniqueSeasons(
    rows
      .map((row) => row.season?.trim() || "")
      .filter(Boolean)
  );
}

async function getCommercialSeason(
  season: string
): Promise<CommercialSeasonRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_commercial_seasons_v1")
    .select("season,previous_sister_season,display_name")
    .eq("season", season)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[getCommercialSeason] No se pudo resolver la campaña ${season}: ${error.message}`
    );
  }

  return (data as CommercialSeasonRow | null) ?? null;
}

async function resolveComparativeContext(
  season: string
): Promise<AnalysisContext> {
  const currentSeason = await getCommercialSeason(season);

  if (!currentSeason?.season) {
    throw new Error(
      `[resolveAnalysisContext] La campaña ${season} no existe en vw_commercial_seasons_v1`
    );
  }

  const previousSisterSeason =
    currentSeason.previous_sister_season?.trim() || null;

  if (!previousSisterSeason) {
    throw new Error(
      `[resolveAnalysisContext] La campaña ${season} no tiene campaña hermana anterior disponible`
    );
  }

  const previousSeason =
    await getCommercialSeason(previousSisterSeason);

  const currentLabel =
    currentSeason.display_name?.trim() ||
    currentSeason.season;

  const previousLabel =
    previousSeason?.display_name?.trim() ||
    previousSisterSeason;

  return {
    type: "COMPARATIVE_SEASONS",
    seasons: [currentSeason.season],
    comparisonSeasons: [previousSisterSeason],
    label: `${currentLabel} vs ${previousLabel}`,
    isHistorical: false,
  };
}

/**
 * Resuelve el contexto temporal compartido por Analytics.
 *
 * Prioridad:
 *
 * 1. Histórico explícito.
 * 2. Comparación explícita con campaña hermana.
 * 3. Temporada concreta.
 * 4. Temporadas activas por defecto.
 */
export async function resolveAnalysisContext(
  options: ResolveAnalysisContextOptions = {}
): Promise<AnalysisContext> {
  if (options.historical === true) {
    return {
      type: "HISTORICAL",
      seasons: [],
      comparisonSeasons: [],
      label: "Histórico completo",
      isHistorical: true,
    };
  }

  const explicitSeason = cleanValue(options.season);

  if (options.compareWithPreviousSister === true) {
    if (!explicitSeason) {
      throw new Error(
        "[resolveAnalysisContext] La comparación con campaña hermana requiere una temporada explícita"
      );
    }

    return resolveComparativeContext(explicitSeason);
  }

  if (explicitSeason) {
    return {
      type: "SINGLE_SEASON",
      seasons: [explicitSeason],
      comparisonSeasons: [],
      label: `Temporada ${explicitSeason}`,
      isHistorical: false,
    };
  }

  const activeSeasons = await getActiveSeasons();

  return {
    type: "ACTIVE_SEASONS",
    seasons: activeSeasons,
    comparisonSeasons: [],
    label: formatSeasonList(activeSeasons),
    isHistorical: false,
  };
}

/**
 * Alias de compatibilidad con Executive.
 */
export type ExecutiveAnalysisContextType =
  AnalysisContextType;

export type ExecutiveAnalysisContext =
  AnalysisContext;

export type ResolveExecutiveAnalysisContextOptions =
  ResolveAnalysisContextOptions;

export const resolveExecutiveAnalysisContext =
  resolveAnalysisContext;