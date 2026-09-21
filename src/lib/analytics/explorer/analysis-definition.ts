import type { ExplorerConceptId } from "@/lib/analytics/explorer/catalog";

export type ExplorerAreaKey =
  | "operations"
  | "commercial"
  | "product"
  | "production"
  | "quality"
  | "logistics"
  | "development"
  | "all";

export type ExplorerPerspectiveKey =
  | "customer"
  | "factory"
  | "season"
  | "operativa";

export type ExplorerContextKey =
  | "active"
  | "single"
  | "comparative"
  | "historical";

export type ExplorerAnalysisDefinition = {
  area: ExplorerAreaKey;
  concept: ExplorerConceptId;
  perspective: ExplorerPerspectiveKey;
  context: ExplorerContextKey;
  season?: string;
  customer?: string;
};

type BuildExplorerAnalysisDefinitionParams = {
  area?: ExplorerAreaKey;
  concept?: ExplorerConceptId;
  perspective?: ExplorerPerspectiveKey;
  context?: ExplorerContextKey;
  season?: string;
  customer?: string;
};

export function buildExplorerAnalysisDefinition({
  area,
  concept,
  perspective,
  context,
  season,
  customer,
}: BuildExplorerAnalysisDefinitionParams): ExplorerAnalysisDefinition | undefined {
  if (!area || !concept || !perspective || !context) {
    return undefined;
  }

  return {
    area,
    concept,
    perspective,
    context,
    ...(season ? { season } : {}),
    ...(customer ? { customer } : {}),
  };
}