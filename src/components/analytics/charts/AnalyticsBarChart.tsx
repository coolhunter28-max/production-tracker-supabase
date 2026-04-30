type AnalyticsBarChartProps = {
  title: string;
  rows: Array<Record<string, string | number | boolean | null>>;
  labelKeys?: string[];
  valueKeys?: string[];
  maxItems?: number;
};

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function detectStringKey(
  rows: Array<Record<string, string | number | boolean | null>>,
  keys?: string[]
) {
  const sample = rows[0];
  if (!sample) return null;

  if (keys && keys.length > 0) {
    for (const key of keys) {
      if (key in sample) return key;
    }
  }

  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "string") return key;
  }

  return null;
}

function detectNumericKey(
  rows: Array<Record<string, string | number | boolean | null>>,
  keys?: string[]
) {
  const sample = rows[0];
  if (!sample) return null;

  if (keys && keys.length > 0) {
    for (const key of keys) {
      if (key in sample && typeof sample[key] === "number") return key;
    }
  }

  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "number") return key;
  }

  return null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function AnalyticsBarChart({
  title,
  rows,
  labelKeys,
  valueKeys,
  maxItems = 10,
}: AnalyticsBarChartProps) {
  const labelKey = detectStringKey(rows, labelKeys);
  const valueKey = detectNumericKey(rows, valueKeys);

  const bars =
    labelKey && valueKey
      ? rows
          .map((row) => ({
            label: String(row[labelKey] ?? "—"),
            value:
              typeof row[valueKey] === "number"
                ? (row[valueKey] as number)
                : Number(row[valueKey] ?? NaN),
          }))
          .filter((item) => Number.isFinite(item.value))
          .slice(0, maxItems)
      : [];

  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        {valueKey ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Métrica: {humanizeKey(valueKey)}
          </p>
        ) : null}
      </div>

      {bars.length === 0 ? (
        <div className="flex min-h-[340px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="space-y-2 px-4 py-4">
          {bars.map((bar) => {
            const width = `${(bar.value / maxValue) * 100}%`;

            return (
              <div key={bar.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{bar.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatNumber(bar.value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-foreground/80" style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}