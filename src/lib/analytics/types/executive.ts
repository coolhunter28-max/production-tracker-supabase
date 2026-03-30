export type AnalyticsDateType = "po" | "pi_etd" | "finish" | "shipping";

export type ExecutiveFilters = {
  season?: string;
  customer?: string;
  factory?: string;
  dateType?: AnalyticsDateType;
  dateFrom?: string;
  dateTo?: string;
};

export type ExecutiveScalar = string | number | boolean | null;
export type ExecutiveRow = Record<string, ExecutiveScalar>;

export type ExecutiveKPIDashboardRow = ExecutiveRow;
export type ExecutiveCustomerRankingRow = ExecutiveRow;
export type ExecutiveFactoryRankingRow = ExecutiveRow;
export type ExecutiveSeasonRankingRow = ExecutiveRow;

export type ExecutiveDashboardData = {
  kpis: ExecutiveKPIDashboardRow[];
  customerRanking: ExecutiveCustomerRankingRow[];
  factoryRanking: ExecutiveFactoryRankingRow[];
  seasonRanking: ExecutiveSeasonRankingRow[];
};

export type ExecutiveKPIConfigItem = {
  key: string;
  label: string;
  format?: "number" | "percent" | "text";
};

export type ExecutiveRankingConfig = {
  title: string;
  labelKeys: string[];
  valueKeys: string[];
  preferredTableColumns?: string[];
};