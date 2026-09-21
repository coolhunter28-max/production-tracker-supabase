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
