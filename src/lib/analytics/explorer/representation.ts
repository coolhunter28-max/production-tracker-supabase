import type { ExplorerAnalysisDefinition } from "@/lib/analytics/explorer/analysis-definition";
import { getExplorerConcept } from "@/lib/analytics/explorer/catalog";

export type ExplorerRepresentationMode = "automatic" | "bar" | "line";

export type ExplorerRepresentationSection =
  | "summary"
  | "ranking"
  | "bar-chart"
  | "line-chart"
  | "table";

export type ExplorerRepresentationPlan = {
  mode: ExplorerRepresentationMode;
  label: "Automática" | "Barras" | "Línea";
  resultLabel:
    | "Resultado automático"
    | "Resultado en barras"
    | "Resultado en línea";
  availableModes: readonly ExplorerRepresentationMode[];
  sections: readonly ExplorerRepresentationSection[];
  bodyLayout: "split" | "single";
};

export type ExplorerRepresentationContext = Pick<
  ExplorerAnalysisDefinition,
  "concept" | "perspective" | "context"
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
  line: "Línea",
} as const satisfies Record<ExplorerRepresentationMode, string>;

export function parseExplorerRepresentationMode(
  value: unknown,
): ExplorerRepresentationMode {
  if (value === "bar") {
    return "bar";
  }

  if (value === "line") {
    return "line";
  }

  return "automatic";
}

export function applyRepresentationToSearchParams(
  params: URLSearchParams,
  mode: ExplorerRepresentationMode,
): URLSearchParams {
  if (mode === "automatic") {
    params.delete("representation");
  } else {
    params.set("representation", mode);
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

  const supportsLine =
    context.concept === "sales" &&
    context.perspective === "customer" &&
    context.context === "historical";

  const availableModes: readonly ExplorerRepresentationMode[] = [
    "automatic",
    ...(supportsBar ? (["bar"] as const) : []),
    ...(supportsLine ? (["line"] as const) : []),
  ];

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

  if (requestedMode === "line" && supportsLine) {
    return {
      mode: "line",
      label: "Línea",
      resultLabel: "Resultado en línea",
      availableModes,
      sections: ["summary", "line-chart"],
      bodyLayout: "single",
    };
  }

  return {
    ...AUTOMATIC_EXPLORER_REPRESENTATION,
    availableModes,
  };
}