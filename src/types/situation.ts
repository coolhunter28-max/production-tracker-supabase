export type SituationMetric = "sales" | "contribution" | "qty";

export type SituationDimension =
  | "customer"
  | "factory"
  | "season"
  | "operativa";

export type SituationChartType = "bar" | "donut" | "line";

export type SituationFilters = {
  metric: SituationMetric;
  dimension: SituationDimension;
  chart: SituationChartType;
  seasons: string[];
  customers: string[];
  factories: string[];
  operativas: string[];
};

export type SituationChartRow = {
  label: string;
  value: number;
};

export type SituationFilterOptions = {
  seasons: string[];
  customers: string[];
  factories: string[];
  operativas: string[];
};