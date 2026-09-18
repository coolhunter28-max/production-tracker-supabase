import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import type { ExplorerSummary } from "@/lib/analytics/explorer/types";

export type CustomerKpiSummary = ExplorerSummary & {
  cards?: AnalyticsKpi[];
};
