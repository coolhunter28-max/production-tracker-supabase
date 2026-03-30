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

function detectLabelKey(
  rows: Array<Record<string, string | number | boolean | null>>,
  labelKeys?: string[]
) {
  const sample = rows[0];
  if (!sample) return null;

  const entries = Object.entries(sample);

  if (labelKeys && labelKeys.length > 0) {
    for (const key of labelKeys) {
      if (key in sample) return key;
    }
  }

  const stringEntry = entries.find(([, value]) => typeof value === "string");
  return stringEntry?.[0] ?? entries[0]?.[0] ?? null;
}

function detectValueKey(
  rows: Array<Record<string, string | number | boolean | null>>,
  valueKeys?: string[]
) {
  const sample = rows[0];
  if (!sample) return null;

  const entries = Object.entries(sample);

  if (valueKeys && valueKeys.length > 0) {
    for (const key of valueKeys) {
      if (key in sample && typeof sample[key] === "number") return key;
    }
  }

  const numericEntry = entries.find(([, value]) => typeof value === "number");
  return numericEntry?.[0] ?? null;
}

function toChartItems(
  rows: Array<Record<string, string | number | boolean | null>>,
  maxItems: number,
  labelKeys?: string[],
  valueKeys?: string[]
) {
  const labelKey = detectLabelKey(rows, labelKeys);
  const valueKey = detectValueKey(rows, valueKeys);

  if (!labelKey || !valueKey) {
    return {
      labelKey,
      valueKey,
      items: [] as Array<{ label: string; value: number }>,
    };
  }

  const items = rows
    .map((row) => ({
      label: String(row[labelKey] ?? "—"),
      value:
        typeof row[valueKey] === "number"
          ? (row[valueKey] as number)
          : Number(row[valueKey] ?? 0),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  return { labelKey, valueKey, items };
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
  maxItems = 8,
}: AnalyticsBarChartProps) {
  const { labelKey, valueKey, items } = toChartItems(
    rows,
    maxItems,
    labelKeys,
    valueKeys
  );

  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const hasData = items.length > 0;

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        {labelKey && valueKey ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {humanizeKey(labelKey)} vs {humanizeKey(valueKey)}
          </p>
        ) : null}
      </div>

      {!hasData ? (
        <div className="flex min-h-[340px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="min-h-[340px] px-4 py-4">
          <div className="space-y-4">
            {items.map((item) => {
              const width =
                maxValue > 0
                  ? `${Math.max((item.value / maxValue) * 100, 2)}%`
                  : "0%";

              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="max-w-[65%] truncate font-medium">
                      {item.label}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatNumber(item.value)}
                    </span>
                  </div>

                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-2.5 rounded-full bg-foreground/80 transition-all"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}