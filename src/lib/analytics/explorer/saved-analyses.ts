import "server-only";

import { createClient } from "@/lib/supabase";
import type { ExplorerAnalysisDefinition } from "@/lib/analytics/explorer/analysis-definition";
import type { ExplorerRepresentationMode } from "@/lib/analytics/explorer/representation";

export type SavedExplorerAnalysis = {
  id: number;
  name: string;
  definition: ExplorerAnalysisDefinition;
  representation: ExplorerRepresentationMode;
  createdAt: string;
};

type SavedAnalysisRow = {
  id: number;
  name: string;
  area: ExplorerAnalysisDefinition["area"];
  concept: ExplorerAnalysisDefinition["concept"];
  perspective: ExplorerAnalysisDefinition["perspective"];
  context: ExplorerAnalysisDefinition["context"];
  season: string | null;
  customer: string | null;
  representation: ExplorerRepresentationMode;
  created_at: string;
};

export async function getSavedExplorerAnalyses(): Promise<
  SavedExplorerAnalysis[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analytics_saved_analyses")
    .select(
      "id, name, area, concept, perspective, context, season, customer, representation, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error loading saved analyses: ${error.message}`);
  }

  return ((data ?? []) as SavedAnalysisRow[]).map(mapSavedAnalysisRow);
}

function mapSavedAnalysisRow(row: SavedAnalysisRow): SavedExplorerAnalysis {
  return {
    id: row.id,
    name: row.name,
    definition: {
      area: row.area,
      concept: row.concept,
      perspective: row.perspective,
      context: row.context,
      ...(row.season ? { season: row.season } : {}),
      ...(row.customer ? { customer: row.customer } : {}),
    },
    representation: row.representation,
    createdAt: row.created_at,
  };
}