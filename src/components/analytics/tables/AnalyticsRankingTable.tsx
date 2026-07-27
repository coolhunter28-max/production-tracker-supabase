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
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-8 text-center">
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Sin resultados
          </div>

          <div className="mt-3 text-sm font-medium">
            No hay filas para mostrar
          </div>

          <div className="mt-1 max-w-sm text-sm text-muted-foreground">
            Prueba a cambiar o limpiar los filtros para ver datos
            en esta tabla.
          </div>
        </div>
      ) : (
        <div
          className={`overflow-auto px-0 ${maxHeightClassName}`}
        >
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
                      className="px-4 py-3 align-top"
                    >
                      {formatCell(
                        row[column],
                        columnFormats[column],
                      )}
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