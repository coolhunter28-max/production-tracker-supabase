type AnalyticsRankingTableValue =
  | string
  | number
  | boolean
  | null;

export type AnalyticsRankingTableFormat =
  | "text"
  | "number"
  | "currency"
  | "percentage";

type AnalyticsRankingTableProps = {
  title: string;
  rows: Array<Record<string, AnalyticsRankingTableValue>>;
  preferredColumns?: string[];
  columnLabels?: Record<string, string>;
  columnFormats?: Record<string, AnalyticsRankingTableFormat>;
  maxHeightClassName?: string;
};

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatCell(
  value: AnalyticsRankingTableValue | undefined,
  format: AnalyticsRankingTableFormat = "text",
) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    if (format === "currency") {
      return formatCurrency(value);
    }

    if (format === "percentage") {
      return formatPercentage(value);
    }

    return formatNumber(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  return String(value);
}

function getColumnWidth(column: string) {
  switch (column) {
    case "ranking":
      return "6%";

    case "customer":
      return "19%";

    case "current_value":
    case "comparison_value":
    case "delta_value":
      return "15%";

    case "current_margin_pct":
    case "comparison_margin_pct":
    case "delta_pct":
      return "10%";

    default:
      return undefined;
  }
}

function getCellClassName(column: string) {
  if (column === "ranking") {
    return "whitespace-nowrap px-1 py-2 text-center align-middle text-[10px] leading-tight";
  }

  if (column === "customer") {
    return "px-2 py-2 align-middle text-[10px] font-medium leading-tight";
  }

  return "whitespace-nowrap px-1.5 py-2 text-right align-middle text-[10px] leading-tight";
}

function getHeaderClassName(column: string) {
  if (column === "ranking") {
    return "px-1 py-2 text-center text-[9px] font-medium uppercase leading-tight tracking-tight text-muted-foreground";
  }

  if (column === "customer") {
    return "px-2 py-2 text-left text-[9px] font-medium uppercase leading-tight tracking-tight text-muted-foreground";
  }

  return "px-1.5 py-2 text-right text-[9px] font-medium uppercase leading-tight tracking-tight text-muted-foreground";
}

export function AnalyticsRankingTable({
  title,
  rows,
  preferredColumns,
  columnLabels = {},
  columnFormats = {},
  maxHeightClassName = "max-h-[340px]",
}: AnalyticsRankingTableProps) {
  const autoColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const columns =
    preferredColumns && preferredColumns.length > 0
      ? preferredColumns.filter((column) =>
          autoColumns.includes(column),
        )
      : autoColumns;

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-3 py-2.5">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-8 text-center">
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Sin resultados
          </div>

          <div className="mt-3 text-xs font-medium">
            No hay filas para mostrar
          </div>

          <div className="mt-1 max-w-sm text-xs text-muted-foreground">
            Prueba a cambiar o limpiar los filtros para ver datos
            en esta tabla.
          </div>
        </div>
      ) : (
        <div
          className={`overflow-auto px-0 ${maxHeightClassName}`}
        >
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column}
                  style={{
                    width: getColumnWidth(column),
                  }}
                />
              ))}
            </colgroup>

            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column}
                    className={getHeaderClassName(column)}
                  >
                    {columnLabels[column] ??
                      humanizeKey(column)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className={getCellClassName(column)}
                    >
                      <span
                        className={
                          column === "customer"
                            ? "block break-words"
                            : "block"
                        }
                      >
                        {formatCell(
                          row[column],
                          columnFormats[column],
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}