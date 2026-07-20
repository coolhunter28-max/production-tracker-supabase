import type {
    ExecutiveAttention,
    ExecutiveAttentionItem,
  } from "@/lib/analytics/executive-v2/attention";
  
  export type ExecutiveAttentionInsightLevel =
    | "critical"
    | "attention"
    | "positive"
    | "neutral";
  
  export type ExecutiveAttentionInsightCode =
    | "CRITICAL_ATTENTION"
    | "TOP_PRIORITY_FOCUS"
    | "OPERATIONAL_SCOPE"
    | "NO_CRITICAL_ATTENTION"
    | "NO_OPERATIONAL_ATTENTION";
  
  export type ExecutiveAttentionInsight = {
    code: ExecutiveAttentionInsightCode;
    level: ExecutiveAttentionInsightLevel;
    title: string;
    description: string;
    actionLabel: string | null;
    actionHref: string | null;
  };
  
  const ALERTS_ROUTE = "/alertas";
  
  function formatInteger(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  function pluralize(
    value: number,
    singular: string,
    plural: string
  ): string {
    return value === 1 ? singular : plural;
  }
  
  function buildCriticalInsight(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight | null {
    const criticalCount = attention.counts.critical;
  
    if (criticalCount <= 0) {
      return null;
    }
  
    return {
      code: "CRITICAL_ATTENTION",
      level: "critical",
      title: "Existen asuntos críticos abiertos",
      description: `Hay ${formatInteger(
        criticalCount
      )} ${pluralize(
        criticalCount,
        "asunto crítico",
        "asuntos críticos"
      )} que requieren seguimiento prioritario.`,
      actionLabel: "Abrir Alertas",
      actionHref: ALERTS_ROUTE,
    };
  }
  
  function buildTopPriorityDescription(
    item: ExecutiveAttentionItem
  ): string {
    const contextParts = [
      item.season
        ? `temporada ${item.season}`
        : null,
      item.poList
        ? `PO ${item.poList}`
        : null,
      item.style,
      item.color,
    ].filter(
      (value): value is string =>
        Boolean(value)
    );
  
    const context =
      contextParts.length > 0
        ? ` ${contextParts.join(" · ")}.`
        : "";
  
    return `${item.message}${context}`;
  }
  
  function buildTopPriorityInsight(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight | null {
    const firstItem = attention.items[0];
  
    if (!firstItem) {
      return null;
    }
  
    const level: ExecutiveAttentionInsightLevel =
      firstItem.level === "critical"
        ? "critical"
        : firstItem.level === "warning"
          ? "attention"
          : "neutral";
  
    return {
      code: "TOP_PRIORITY_FOCUS",
      level,
      title: `${firstItem.customer}: ${firstItem.title}`,
      description:
        buildTopPriorityDescription(firstItem),
      actionLabel: "Ver detalle operativo",
      actionHref: ALERTS_ROUTE,
    };
  }
  
  function buildOperationalScopeInsight(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight | null {
    if (attention.counts.total <= 0) {
      return null;
    }
  
    const {
      affectedCustomers,
      affectedProductions,
    } = attention;
  
    return {
      code: "OPERATIONAL_SCOPE",
      level:
        attention.counts.critical > 0
          ? "attention"
          : "neutral",
      title: "Alcance de los frentes abiertos",
      description: `La actividad pendiente afecta a ${formatInteger(
        affectedCustomers
      )} ${pluralize(
        affectedCustomers,
        "cliente",
        "clientes"
      )} y ${formatInteger(
        affectedProductions
      )} ${pluralize(
        affectedProductions,
        "producción",
        "producciones"
      )}.`,
      actionLabel: "Abrir Alertas",
      actionHref: ALERTS_ROUTE,
    };
  }
  
  function buildNoCriticalInsight(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight | null {
    if (
      attention.counts.total <= 0 ||
      attention.counts.critical > 0
    ) {
      return null;
    }
  
    return {
      code: "NO_CRITICAL_ATTENTION",
      level: "positive",
      title: "No existen asuntos críticos abiertos",
      description: `La operativa mantiene ${formatInteger(
        attention.counts.warning
      )} ${pluralize(
        attention.counts.warning,
        "asunto que requiere seguimiento",
        "asuntos que requieren seguimiento"
      )}, pero ninguno está clasificado como crítico.`,
      actionLabel: "Abrir Alertas",
      actionHref: ALERTS_ROUTE,
    };
  }
  
  function buildNoAttentionInsight(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight | null {
    if (attention.counts.total > 0) {
      return null;
    }
  
    return {
      code: "NO_OPERATIONAL_ATTENTION",
      level: "positive",
      title: "Sin asuntos operativos prioritarios",
      description:
        "No existen alertas activas para el contexto seleccionado.",
      actionLabel: null,
      actionHref: null,
    };
  }
  
  export function buildExecutiveAttentionInsights(
    attention: ExecutiveAttention
  ): ExecutiveAttentionInsight[] {
    const candidates: Array<
      ExecutiveAttentionInsight | null
    > = [
      buildCriticalInsight(attention),
      buildTopPriorityInsight(attention),
      buildOperationalScopeInsight(attention),
      buildNoCriticalInsight(attention),
      buildNoAttentionInsight(attention),
    ];
  
    const uniqueCodes =
      new Set<ExecutiveAttentionInsightCode>();
  
    return candidates
      .filter(
        (
          insight
        ): insight is ExecutiveAttentionInsight =>
          insight !== null
      )
      .filter((insight) => {
        if (uniqueCodes.has(insight.code)) {
          return false;
        }
  
        uniqueCodes.add(insight.code);
  
        return true;
      })
      .slice(0, 3);
  }