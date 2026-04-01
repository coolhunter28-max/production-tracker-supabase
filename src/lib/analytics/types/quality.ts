export type QualityFilters = {
  customer?: string;
  factory?: string;
  style?: string;
};

export type QualityScalar = string | number | boolean | null;
export type QualityRow = Record<string, QualityScalar>;

export type QualityByCustomerRow = QualityRow;
export type QualityByFactoryRow = QualityRow;
export type QualityByModelRow = QualityRow;

export type QualityOverviewData = {
  customerRows: QualityByCustomerRow[];
  factoryRows: QualityByFactoryRow[];
  modelRows: QualityByModelRow[];
};

export type QualityFilterOptions = {
  customers: string[];
  factories: string[];
  styles: string[];
};

export type QualityRankingConfig = {
  title: string;
  labelKeys: string[];
  valueKeys: string[];
  preferredTableColumns?: string[];
};