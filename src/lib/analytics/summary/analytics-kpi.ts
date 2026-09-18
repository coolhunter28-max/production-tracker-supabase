export type AnalyticsKpiChangeFormat =
  | "currency"
  | "percentage"
  | "percentage-points";

export type AnalyticsKpi = {
  label: string;
  value: number | null;
  format: "currency" | "percentage" | "integer";
  currency?: string;

  comparisonValue?: number | null;
  changeValue?: number | null;
  changeFormat?: AnalyticsKpiChangeFormat;
};
