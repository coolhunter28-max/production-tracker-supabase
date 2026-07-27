import { createClient } from "@/lib/supabase";

export type AnalysisContextType =
  | "ACTIVE_SEASONS"
  | "SINGLE_SEASON"
  | "COMPARATIVE_SEASONS"
  | "HISTORICAL";

export type AnalysisContext = {
  type: AnalysisContextType;
  seasons: string[];
  comparisonSeasons: string[];
  label: string;
  isHistorical: boolean;
};

export type ResolveAnalysisContextOptions = {
  season?: string;
  historical?: boolean;
  compareWithPreviousSister?: boolean;
};

export type CommercialSeasonOption = {
  season: string;
  displayName: string;
  previousSisterSeason: string | null;
  isActive: boolean;
};

type ActiveSeasonRow = {
  season: string | null;
  is_active: boolean | null;
};

type CommercialSeasonRow = {
  season: string | null;
  previous_sister_season: string | null;
  display_name: string | null;
  sequence_prefix: number | null;
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
        .filter(Boolean),
    ),
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
      `[getActiveSeasons] No se pudieron cargar las temporadas activas: ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as ActiveSeasonRow[];

  return uniqueSeasons(
    rows
      .map((row) => row.season?.trim() || "")
      .filter(Boolean),
  );
}

export async function getCommercialSeasons(): Promise<
  CommercialSeasonOption[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_commercial_seasons_v1")
    .select(
      "season,display_name,previous_sister_season,sequence_prefix,is_active",
    )
    .not("season_type", "is", null)
    .order("sequence_prefix", { ascending: false });

  if (error) {
    throw new Error(
      `[getCommercialSeasons] No se pudieron cargar las campañas comerciales: ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as CommercialSeasonRow[];

  return rows.flatMap((row) => {
    const season = row.season?.trim();

    if (!season) {
      return [];
    }

    return [
      {
        season,
        displayName: row.display_name?.trim() || season,
        previousSisterSeason:
          row.previous_sister_season?.trim() || null,
        isActive: row.is_active === true,
      },
    ];
  });
}

async function getCommercialSeason(
  season: string,
): Promise<CommercialSeasonRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_commercial_seasons_v1")
    .select(
      "season,previous_sister_season,display_name,sequence_prefix,is_active",
    )
    .eq("season", season)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[getCommercialSeason] No se pudo resolver la campaña ${season}: ${error.message}`,
    );
  }

  return (data as CommercialSeasonRow | null) ?? null;
}

async function resolveComparativeContext(
  season: string,
): Promise<AnalysisContext> {
  const currentSeason = await getCommercialSeason(season);

  if (!currentSeason?.season) {
    throw new Error(
      `[resolveAnalysisContext] La campaña ${season} no existe en vw_commercial_seasons_v1`,
    );
  }

  const previousSisterSeason =
    currentSeason.previous_sister_season?.trim() || null;

  if (!previousSisterSeason) {
    throw new Error(
      `[resolveAnalysisContext] La campaña ${season} no tiene campaña hermana anterior disponible`,
    );
  }

  const previousSeason = await getCommercialSeason(
    previousSisterSeason,
  );

  const currentLabel =
    currentSeason.display_name?.trim() || currentSeason.season;

  const previousLabel =
    previousSeason?.display_name?.trim() || previousSisterSeason;

  return {
    type: "COMPARATIVE_SEASONS",
    seasons: [currentSeason.season],
    comparisonSeasons: [previousSisterSeason],
    label: `${currentLabel} vs ${previousLabel}`,
    isHistorical: false,
  };
}

export async function resolveAnalysisContext(
  options: ResolveAnalysisContextOptions = {},
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
        "[resolveAnalysisContext] La comparación con campaña hermana requiere una temporada explícita",
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

export type ExecutiveAnalysisContextType = AnalysisContextType;
export type ExecutiveAnalysisContext = AnalysisContext;
export type ResolveExecutiveAnalysisContextOptions =
  ResolveAnalysisContextOptions;

export const resolveExecutiveAnalysisContext =
  resolveAnalysisContext;