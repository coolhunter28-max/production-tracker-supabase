type AnalyticsScatterChartProps = {
  title: string;
  rows: Array<Record<string, string | number | boolean | null>>;
  labelKeys?: string[];
  xKeys?: string[];
  yKeys?: string[];
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

export function AnalyticsScatterChart({
  title,
  rows,
  labelKeys,
  xKeys,
  yKeys,
  maxItems = 20,
}: AnalyticsScatterChartProps) {
  const labelKey = detectStringKey(rows, labelKeys);
  const xKey = detectNumericKey(rows, xKeys);
  const yKey = detectNumericKey(rows, yKeys);

  const points =
    labelKey && xKey && yKey
      ? rows
          .map((row) => ({
            label: String(row[labelKey] ?? "—"),
            x:
              typeof row[xKey] === "number"
                ? (row[xKey] as number)
                : Number(row[xKey] ?? NaN),
            y:
              typeof row[yKey] === "number"
                ? (row[yKey] as number)
                : Number(row[yKey] ?? NaN),
          }))
          .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
          .slice(0, maxItems)
      : [];

  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        {xKey && yKey ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {humanizeKey(xKey)} vs {humanizeKey(yKey)}
          </p>
        ) : null}
      </div>

      {points.length === 0 ? (
        <div className="flex min-h-[340px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="space-y-4 px-4 py-4">
          <div className="relative h-[320px] rounded-xl border bg-background">
            {points.map((point) => {
              const left = `${(point.x / maxX) * 100}%`;
              const bottom = `${(point.y / maxY) * 100}%`;

              return (
                <div
                  key={`${point.label}-${point.x}-${point.y}`}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left, bottom }}
                  title={`${point.label} · X: ${formatNumber(point.x)} · Y: ${formatNumber(point.y)}`}
                >
                  <div className="h-3 w-3 rounded-full bg-foreground/80" />
                </div>
              );
            })}

            <div className="absolute bottom-2 left-2 text-[11px] text-muted-foreground">
              {xKey ? humanizeKey(xKey) : "X"}
            </div>
            <div className="absolute right-2 top-2 text-[11px] text-muted-foreground">
              {yKey ? humanizeKey(yKey) : "Y"}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {points.slice(0, 8).map((point) => (
              <div
                key={`${point.label}-legend`}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
              >
                <span className="truncate">{point.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatNumber(point.x)} / {formatNumber(point.y)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}