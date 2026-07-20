import type { ExecutiveSummary } from "@/lib/analytics/executive-v2/summary";

export type ExecutiveInsightTone =
  | "neutral"
  | "positive"
  | "attention";

export type ExecutiveInsightCode =
  | "NO_DATA"
  | "ANALYSIS_CONTEXT"
  | "BUSINESS_MIX"
  | "COMMERCIAL_CONTRIBUTION"
  | "ACTIVITY_SCOPE";

export type ExecutiveInsight = {
  code: ExecutiveInsightCode;
  tone: ExecutiveInsightTone;
  title: string;
  description: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "0 %";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value) + " %";
}

function hasActivity(summary: ExecutiveSummary): boolean {
  return (
    summary.activity.poCount > 0 ||
    summary.activity.customerCount > 0 ||
    summary.activity.modelCount > 0 ||
    summary.activity.quantityTotal > 0 ||
    summary.business.salesAmount > 0
  );
}

function buildContextInsight(
  summary: ExecutiveSummary
): ExecutiveInsight {
  const contextParts: string[] = [];

  if (summary.context.season) {
    contextParts.push(
      `temporada ${summary.context.season}`
    );
  }

  if (summary.context.customer) {
    contextParts.push(
      `cliente ${summary.context.customer}`
    );
  }

  if (summary.context.factory) {
    contextParts.push(
      `fábrica ${summary.context.factory}`
    );
  }

  if (contextParts.length === 0) {
    return {
      code: "ANALYSIS_CONTEXT",
      tone: "neutral",
      title: "Resumen global",
      description:
        "La información corresponde al conjunto completo de la actividad comercial registrada en Production Tracker.",
    };
  }

  return {
    code: "ANALYSIS_CONTEXT",
    tone: "neutral",
    title: "Contexto del análisis",
    description: `La información mostrada corresponde a ${contextParts.join(
      ", "
    )}.`,
  };
}

function buildBusinessMixInsight(
  summary: ExecutiveSummary
): ExecutiveInsight | null {
  const bsgMix =
    summary.operations.bsg.salesMixPercent;

  const xiamenMix =
    summary.operations.xiamenDic.salesMixPercent;

  if (bsgMix === null && xiamenMix === null) {
    return null;
  }

  const safeBsgMix = bsgMix ?? 0;
  const safeXiamenMix = xiamenMix ?? 0;

  if (safeBsgMix === safeXiamenMix) {
    return {
      code: "BUSINESS_MIX",
      tone: "neutral",
      title: "Mix equilibrado",
      description: `El volumen comercial se distribuye de forma equilibrada entre BSG (${formatPercent(
        safeBsgMix
      )}) y Xiamen DIC (${formatPercent(
        safeXiamenMix
      )}).`,
    };
  }

  const predominantOperation =
    safeBsgMix > safeXiamenMix
      ? "BSG"
      : "Xiamen DIC";

  const predominantMix = Math.max(
    safeBsgMix,
    safeXiamenMix
  );

  const secondaryOperation =
    predominantOperation === "BSG"
      ? "Xiamen DIC"
      : "BSG";

  const secondaryMix = Math.min(
    safeBsgMix,
    safeXiamenMix
  );

  return {
    code: "BUSINESS_MIX",
    tone: "neutral",
    title: `${predominantOperation} concentra el mayor peso`,
    description: `${predominantOperation} representa el ${formatPercent(
      predominantMix
    )} del volumen comercial y ${secondaryOperation} el ${formatPercent(
      secondaryMix
    )}.`,
  };
}

function buildContributionInsight(
  summary: ExecutiveSummary
): ExecutiveInsight | null {
  const totalContribution =
    summary.business.contributionAmount;

  if (totalContribution <= 0) {
    return null;
  }

  const bsgMargin =
    summary.operations.bsg.marginAmount;

  const xiamenMargin =
    summary.operations.xiamenDic.marginAmount;

  return {
    code: "COMMERCIAL_CONTRIBUTION",
    tone: "neutral",
    title: "Contribución comercial",
    description: `La contribución total asciende a ${formatCurrency(
      totalContribution
    )}: ${formatCurrency(
      bsgMargin
    )} proceden de BSG y ${formatCurrency(
      xiamenMargin
    )} de Xiamen DIC.`,
  };
}

function buildActivityScopeInsight(
  summary: ExecutiveSummary
): ExecutiveInsight {
  const {
    customerCount,
    poCount,
    modelCount,
    quantityTotal,
  } = summary.activity;

  return {
    code: "ACTIVITY_SCOPE",
    tone: "neutral",
    title: "Alcance de la actividad",
    description: `El contexto analizado incluye ${formatInteger(
      customerCount
    )} clientes, ${formatInteger(
      poCount
    )} pedidos, ${formatInteger(
      modelCount
    )} modelos y ${formatInteger(
      quantityTotal
    )} unidades.`,
  };
}

export function buildExecutiveInsights(
  summary: ExecutiveSummary
): ExecutiveInsight[] {
  if (!hasActivity(summary)) {
    return [
      {
        code: "NO_DATA",
        tone: "attention",
        title: "Sin actividad para este contexto",
        description:
          "No existen datos comerciales registrados para los filtros seleccionados.",
      },
      buildContextInsight(summary),
    ];
  }

  const insights: Array<
    ExecutiveInsight | null
  > = [
    buildContextInsight(summary),
    buildBusinessMixInsight(summary),
    buildContributionInsight(summary),
    buildActivityScopeInsight(summary),
  ];

  return insights.filter(
    (
      insight
    ): insight is ExecutiveInsight =>
      insight !== null
  );
}