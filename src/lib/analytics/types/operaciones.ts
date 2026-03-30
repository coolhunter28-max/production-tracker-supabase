export type AnalyticsDateType = "po" | "pi_etd" | "finish" | "shipping";

export type OperacionesFilters = {
  season?: string;
  customer?: string;
  factory?: string;
  operativa?: string;
  dateType?: AnalyticsDateType;
  dateFrom?: string;
  dateTo?: string;
};

export type OperacionesScalar = string | number | boolean | null;
export type OperacionesRow = Record<string, OperacionesScalar>;

export type OperacionesCustomerRankingRow = OperacionesRow;
export type OperacionesFactoryRankingRow = OperacionesRow;
export type OperacionesSeasonRankingRow = OperacionesRow;
export type OperacionesLogisticsPressureRow = OperacionesRow;

export type OperacionesOverviewData = {
  customerRanking: OperacionesCustomerRankingRow[];
  factoryRanking: OperacionesFactoryRankingRow[];
  seasonRanking: OperacionesSeasonRankingRow[];
  logisticsRanking: OperacionesLogisticsPressureRow[];
};

export type OperacionesFilterOptions = {
  seasons: string[];
  customers: string[];
  factories: string[];
};

export type OperacionesRankingConfig = {
  title: string;
  labelKeys: string[];
  valueKeys: string[];
  preferredTableColumns?: string[];
};