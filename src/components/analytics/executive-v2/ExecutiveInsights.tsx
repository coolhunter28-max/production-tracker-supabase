import type {
    ExecutiveInsight,
    ExecutiveInsightTone,
  } from "@/lib/analytics/executive-v2/insights";
  
  type ExecutiveInsightsProps = {
    insights: ExecutiveInsight[];
  };
  
  const TONE_STYLES: Record<
    ExecutiveInsightTone,
    {
      container: string;
      indicator: string;
      label: string;
    }
  > = {
    positive: {
      container:
        "border-emerald-200 bg-emerald-50/70",
      indicator: "bg-emerald-500",
      label: "Positivo",
    },
  
    neutral: {
      container:
        "border-slate-200 bg-white",
      indicator: "bg-blue-500",
      label: "Información",
    },
  
    attention: {
      container:
        "border-amber-200 bg-amber-50/70",
      indicator: "bg-amber-500",
      label: "Atención",
    },
  };
  
  function InsightCard({
    insight,
  }: {
    insight: ExecutiveInsight;
  }) {
    const tone = TONE_STYLES[insight.tone];
  
    return (
      <article
        className={`relative overflow-hidden rounded-xl border p-5 ${tone.container}`}
      >
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${tone.indicator}`}
        />
  
  <div className="pl-2">
  <h3 className="text-base font-semibold text-slate-950">
    {insight.title}
  </h3>

  <p className="mt-2 text-sm leading-6 text-slate-600">
    {insight.description}
  </p>
</div>
      </article>
    );
  }
  
  export default function ExecutiveInsights({
    insights,
  }: ExecutiveInsightsProps) {
    if (insights.length === 0) {
      return null;
    }
  
    return (
      <section
        aria-labelledby="executive-insights-title"
        className="space-y-4"
      >
        <div>
          <h2
            id="executive-insights-title"
            className="text-xl font-semibold text-slate-950"
          >
             Resumen ejecutivo
          </h2>
  
          <p className="mt-1 text-sm text-slate-600">
          Interpretación del contexto comercial y operativo.
          </p>
        </div>
  
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.map((insight) => (
            <InsightCard
              key={insight.code}
              insight={insight}
            />
          ))}
        </div>
      </section>
    );
  }