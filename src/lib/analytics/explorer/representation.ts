import type { ExplorerAnalysisDefinition } from "@/lib/analytics/explorer/analysis-definition";

export type ExplorerRepresentationMode = "automatic";

export type ExplorerRepresentationSection =
  | "summary"
  | "bar"
  | "table";

export type ExplorerRepresentationPlan = {
  mode: ExplorerRepresentationMode;
  label: "Automática";
  availableModes: readonly ExplorerRepresentationMode[];
  sections: readonly ExplorerRepresentationSection[];
};

export const AUTOMATIC_EXPLORER_REPRESENTATION = {
  mode: "automatic",
  label: "Automática",
  availableModes: ["automatic"],
  sections: ["summary", "bar", "table"],
} as const satisfies ExplorerRepresentationPlan;

export function resolveRepresentationPlan(
  _definition: ExplorerAnalysisDefinition,
): ExplorerRepresentationPlan {
  return AUTOMATIC_EXPLORER_REPRESENTATION;
}
