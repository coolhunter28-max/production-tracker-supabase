import { createClient } from "@/lib/supabase";

export type ExecutiveNarrativeRow = {
  narrative_order: number;
  narrative_code: string;
  narrative_level: string;
  narrative_text: string;
  customer: string | null;
  recommended_action: string | null;
};

export async function getExecutiveNarrative(filters: {
  season?: string | null;
  customer?: string | null;
  factory?: string | null;
}): Promise<ExecutiveNarrativeRow[]> {
  const supabase = await createClient();

  const hasSeason = Boolean(filters.season);

  const { data, error } = await supabase.rpc(
    hasSeason ? "get_exec_narrative_season_v1" : "get_exec_narrative_v1",
    {
      p_season: filters.season ?? null,
      p_customer: filters.customer ?? null,
      p_factory: filters.factory ?? null,
    }
  );

  if (error) {
    console.error("getExecutiveNarrative error:", error);
    return [];
  }

  return (data ?? []) as ExecutiveNarrativeRow[];
}