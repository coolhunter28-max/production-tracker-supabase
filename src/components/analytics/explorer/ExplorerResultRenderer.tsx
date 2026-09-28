import type { ComponentProps } from "react";

import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart";
import { ExplorerSummaryCard } from "@/components/analytics/explorer/ExplorerSummaryCard";
import { AnalyticsRankingTable } from "@/components/analytics/tables/AnalyticsRankingTable";
import type { ExplorerRepresentationPlan } from "@/lib/analytics/explorer/representation";
import type { CustomerKpiSummary } from "@/lib/analytics/summary/customer-kpi-summary";

type ExplorerResultRendererProps = {
  plan: ExplorerRepresentationPlan;
  summary: CustomerKpiSummary;
  barChart: ComponentProps<typeof AnalyticsBarChart>;
  rankingTable: ComponentProps<typeof AnalyticsRankingTable>;
};

export function ExplorerResultRenderer({
  plan,
  summary,
  barChart,
  rankingTable,
}: ExplorerResultRendererProps) {
  const showSummary = plan.sections.includes("summary");
  const showBar = plan.sections.includes("bar");
  const showTable = plan.sections.includes("table");

  return (
    <>
      {showSummary ? <ExplorerSummaryCard summary={summary} /> : null}

      {showBar || showTable ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {showBar ? <AnalyticsBarChart {...barChart} /> : null}
          {showTable ? (
            <AnalyticsRankingTable {...rankingTable} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
