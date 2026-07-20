import ExecutiveAttention from "@/components/analytics/executive-v2/ExecutiveAttention";
import ExecutiveInsights from "@/components/analytics/executive-v2/ExecutiveInsights";
import ExecutiveSummary from "@/components/analytics/executive-v2/ExecutiveSummary";

import {
  buildExecutiveAttentionInsights,
} from "@/lib/analytics/executive-v2/attention-insights";
import {
  getExecutiveAttention,
  type ExecutiveAttentionFilters,
} from "@/lib/analytics/executive-v2/attention";
import {
  buildExecutiveInsights,
} from "@/lib/analytics/executive-v2/insights";
import {
  getExecutiveSummary,
  type ExecutiveSummaryFilters,
} from "@/lib/analytics/executive-v2/summary";

type SearchParamValue = string | string[] | undefined;

type ExecutivePageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function firstSearchParam(
  value: SearchParamValue
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function cleanSearchParam(
  value: SearchParamValue
): string | undefined {
  const firstValue = firstSearchParam(value);
  const cleaned = firstValue?.trim();

  return cleaned || undefined;
}

export default async function ExecutivePage({
  searchParams,
}: ExecutivePageProps) {
  const resolvedSearchParams = searchParams
    ? await searchParams
    : {};

  const season = cleanSearchParam(
    resolvedSearchParams.season
  );

  const customer = cleanSearchParam(
    resolvedSearchParams.customer
  );

  const factory = cleanSearchParam(
    resolvedSearchParams.factory
  );

  const summaryFilters: ExecutiveSummaryFilters = {
    season,
    customer,
    factory,
  };

  const attentionFilters: ExecutiveAttentionFilters = {
    season,
    customer,
  };

  const [summary, attention] = await Promise.all([
    getExecutiveSummary(summaryFilters),
    getExecutiveAttention(attentionFilters),
  ]);

  const insights = buildExecutiveInsights(summary);

  const attentionInsights =
    buildExecutiveAttentionInsights(attention);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-1">
  <h1 className="text-4xl font-bold tracking-tight">
  
  </h1>

  <div>
    <p className="text-sm font-medium text-slate-500">
      Contexto comercial
    </p>

    <p className="text-base text-slate-700">
      {summary.context.label}
    </p>
  </div>
</div>
      <ExecutiveSummary summary={summary} />

      <ExecutiveInsights insights={insights} />

      <ExecutiveAttention
        insights={attentionInsights}
      />
    </main>
  );
}