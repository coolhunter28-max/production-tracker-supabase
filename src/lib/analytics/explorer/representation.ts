import type { ExplorerAnalysisDefinition } from "@/lib/analytics/explorer/analysis-definition";
import { getExplorerConcept } from "@/lib/analytics/explorer/catalog";

export type ExplorerRepresentationMode = "automatic" | "bar";

export type ExplorerRepresentationSection =
  | "summary"
  | "ranking"
  | "bar-chart"
  | "table";

export type ExplorerRepresentationPlan = {
  mode: ExplorerRepresentationMode;
  label: "Automática" | "Barras";
  resultLabel: "Resultado automático" | "Resultado en barras";
  availableModes: readonly ExplorerRepresentationMode[];
  sections: readonly ExplorerRepresentationSection[];
  bodyLayout: "split" | "single";
};

export type ExplorerRepresentationContext = Pick<
  ExplorerAnalysisDefinition,
  "concept" | "perspective"
>;

export const AUTOMATIC_EXPLORER_REPRESENTATION = {
  mode: "automatic",
  label: "Automática",
  resultLabel: "Resultado automático",
  availableModes: ["automatic"],
  sections: ["summary", "ranking", "table"],
  bodyLayout: "split",
} as const satisfies ExplorerRepresentationPlan;

export const EXPLORER_REPRESENTATION_LABELS = {
  automatic: "Automática",
  bar: "Barras",
} as const satisfies Record<ExplorerRepresentationMode, string>;

export function parseExplorerRepresentationMode(
  value: unknown,
): ExplorerRepresentationMode {
  return value === "bar" ? "bar" : "automatic";
}

export function applyRepresentationToSearchParams(
  params: URLSearchParams,
  mode: ExplorerRepresentationMode,
): URLSearchParams {
  if (mode === "bar") {
    params.set("representation", "bar");
  } else {
    params.delete("representation");
  }

  return params;
}

export function resolveRepresentationPlan(
  context: ExplorerRepresentationContext,
  requestedMode: ExplorerRepresentationMode = "automatic",
): ExplorerRepresentationPlan {
  const concept = getExplorerConcept(context.concept);
  const supportsBar =
    context.perspective === "customer" &&
    concept.representation.chart === "bar";
  const availableModes: readonly ExplorerRepresentationMode[] = supportsBar
    ? ["automatic", "bar"]
    : ["automatic"];

  if (requestedMode === "bar" && supportsBar) {
    return {
      mode: "bar",
      label: "Barras",
      resultLabel: "Resultado en barras",
      availableModes,
      sections: ["summary", "bar-chart"],
      bodyLayout: "single",
    };
  }

  return {
    ...AUTOMATIC_EXPLORER_REPRESENTATION,
    availableModes,
  };
}
