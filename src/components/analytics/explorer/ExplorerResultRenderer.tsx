import type { ComponentProps } from "react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { ExplorerBarChart } from "@/components/analytics/explorer/ExplorerBarChart";
import { ExplorerSummaryCard } from "@/components/analytics/explorer/ExplorerSummaryCard";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import type { ExplorerRepresentationPlan } from "@/lib/analytics/explorer/representation";
import type { CustomerKpiSummary } from "@/lib/analytics/summary/customer-kpi-summary";

type ExplorerResultRendererProps = {
  plan: ExplorerRepresentationPlan;
  summary: CustomerKpiSummary;
  ranking: ComponentProps<typeof AnalyticsBarChart>;
  barChart: ComponentProps<typeof ExplorerBarChart>;
  rankingTable: ComponentProps<typeof AnalyticsRankingTable>;
};

export function ExplorerResultRenderer({
  plan,
  summary,
  ranking,
  barChart,
  rankingTable,
}: ExplorerResultRendererProps) {
  const showSummary = plan.sections.includes("summary");
  const showRanking = plan.sections.includes("ranking");
  const showBarChart = plan.sections.includes("bar-chart");
  const showTable = plan.sections.includes("table");

  return (
    <>
      {showSummary ? <ExplorerSummaryCard summary={summary} /> : null}

      {showRanking || showBarChart || showTable ? (
        <div
          className={
            plan.bodyLayout === "split"
              ? "grid gap-5 xl:grid-cols-2"
              : "grid gap-5"
          }
        >
          {showRanking ? <AnalyticsBarChart {...ranking} /> : null}
          {showBarChart ? <ExplorerBarChart {...barChart} /> : null}
          {showTable ? (
            <AnalyticsRankingTable {...rankingTable} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
