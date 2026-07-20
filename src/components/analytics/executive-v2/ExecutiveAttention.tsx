import Link from "next/link";

import type {
  ExecutiveAttentionInsight,
  ExecutiveAttentionInsightLevel,
} from "@/lib/analytics/executive-v2/attention-insights";

type ExecutiveAttentionProps = {
  insights: ExecutiveAttentionInsight[];
};

const LEVEL_STYLES: Record<
  ExecutiveAttentionInsightLevel,
  {
    border: string;
    background: string;
    indicator: string;
    title: string;
  }
> = {
  critical: {
    border: "border-red-200",
    background: "bg-red-50/70",
    indicator: "bg-red-500",
    title: "text-red-800",
  },

  attention: {
    border: "border-amber-200",
    background: "bg-amber-50/70",
    indicator: "bg-amber-500",
    title: "text-amber-800",
  },

  positive: {
    border: "border-emerald-200",
    background: "bg-emerald-50/70",
    indicator: "bg-emerald-500",
    title: "text-emerald-800",
  },

  neutral: {
    border: "border-slate-200",
    background: "bg-white",
    indicator: "bg-slate-400",
    title: "text-slate-950",
  },
};

function AttentionItem({
  insight,
}: {
  insight: ExecutiveAttentionInsight;
}) {
  const styles = LEVEL_STYLES[insight.level];

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-5 ${styles.border} ${styles.background}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${styles.indicator}`}
      />

      <div className="pl-2">
        <h3
          className={`text-base font-semibold ${styles.title}`}
        >
          {insight.title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {insight.description}
        </p>

        {insight.actionHref && insight.actionLabel ? (
          <div className="mt-4">
            <Link
              href={insight.actionHref}
              className="inline-flex items-center text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
            >
              {insight.actionLabel}
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ExecutiveAttention({
  insights,
}: ExecutiveAttentionProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="executive-attention-title"
      className="space-y-4"
    >
      <div>
        <h2
          id="executive-attention-title"
          className="text-xl font-semibold text-slate-950"
        >
          Requiere atención
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Los asuntos que merecen seguimiento desde dirección.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {insights.map((insight) => (
          <AttentionItem
            key={insight.code}
            insight={insight}
          />
        ))}
      </div>
    </section>
  );
}