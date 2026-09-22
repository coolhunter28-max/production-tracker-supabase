"use server";

import { revalidatePath } from "next/cache";

import type { ExplorerAnalysisDefinition } from "@/lib/analytics/explorer/analysis-definition";
import { createClient } from "@/lib/supabase";

export async function saveExplorerAnalysisAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("No authenticated user.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const concept = String(formData.get("concept") ?? "").trim();
  const perspective = String(formData.get("perspective") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();

  if (!name) {
    throw new Error("Analysis name is required.");
  }

  if (!area || !concept || !perspective || !context) {
    throw new Error("Incomplete analysis definition.");
  }

  const definition: ExplorerAnalysisDefinition = {
    area: area as ExplorerAnalysisDefinition["area"],
    concept: concept as ExplorerAnalysisDefinition["concept"],
    perspective: perspective as ExplorerAnalysisDefinition["perspective"],
    context: context as ExplorerAnalysisDefinition["context"],
    ...(season ? { season } : {}),
    ...(customer ? { customer } : {}),
  };

  const { error } = await supabase.from("analytics_saved_analyses").insert({
    name,
    area: definition.area,
    concept: definition.concept,
    perspective: definition.perspective,
    context: definition.context,
    season: definition.season ?? null,
    customer: definition.customer ?? null,
  });

  if (error) {
    throw new Error(`Error saving analysis: ${error.message}`);
  }

  revalidatePath("/analytics/explorer");
}
