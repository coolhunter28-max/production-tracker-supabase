import type { AnalyticsKpiChangeFormat } from "@/lib/analytics/summary/analytics-kpi";

export type AnalyticsChange = {
  changeValue: number | null;
  changeFormat: AnalyticsKpiChangeFormat;
};

export function calculateAbsoluteChange(
  currentValue: number | null,
  comparisonValue: number | null,
): number | null {
  if (currentValue === null || comparisonValue === null) {
    return null;
  }

  return currentValue - comparisonValue;
}

export function calculateRelativeChange(
  currentValue: number | null,
  comparisonValue: number | null,
): number | null {
  if (
    currentValue === null ||
    comparisonValue === null ||
    comparisonValue === 0
  ) {
    return null;
  }

  return (
    ((currentValue - comparisonValue) /
      Math.abs(comparisonValue)) *
    100
  );
}

export function calculatePercentagePointChange(
  currentValue: number | null,
  comparisonValue: number | null,
): number | null {
  return calculateAbsoluteChange(
    currentValue,
    comparisonValue,
  );
}

export function buildMonetaryChange(
  currentValue: number | null,
  comparisonValue: number | null,
): AnalyticsChange {
  if (
    currentValue === null ||
    comparisonValue === null
  ) {
    return {
      changeValue: null,
      changeFormat: "percentage",
    };
  }

  if (comparisonValue <= 0) {
    return {
      changeValue: calculateAbsoluteChange(
        currentValue,
        comparisonValue,
      ),
      changeFormat: "currency",
    };
  }

  return {
    changeValue: calculateRelativeChange(
      currentValue,
      comparisonValue,
    ),
    changeFormat: "percentage",
  };
}
