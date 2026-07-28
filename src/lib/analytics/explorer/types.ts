export type ExplorerValueFormat =
  | "currency"
  | "percentage"
  | "integer"
  | "text";

export type ExplorerSummaryValue = number | string | null;

export type ExplorerSummaryItem = {
  label: string;
  value: ExplorerSummaryValue;
  format: ExplorerValueFormat;

  /**
   * Código ISO 4217 utilizado cuando format === "currency".
   * Ejemplos: USD, EUR.
   */
  currency?: string;
};

export type ExplorerSummary = {
  primary: ExplorerSummaryItem;
  secondary: ExplorerSummaryItem;
  tertiary: ExplorerSummaryItem;
};

export type ExplorerResponse<TRow> = {
  summary: ExplorerSummary;
  rows: TRow[];
};