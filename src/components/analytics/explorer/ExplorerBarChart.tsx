"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ExplorerBarChartValue = string | number | boolean | null;

export type ExplorerBarChartValueFormat =
  | "number"
  | "currency"
  | "percentage";

type ExplorerBarChartProps = {
  title: string;
  rows: Array<Record<string, ExplorerBarChartValue>>;
  labelKeys?: string[];
  valueKeys?: string[];
  valueLabel?: string;
  valueFormat?: ExplorerBarChartValueFormat;
  maxItems?: number;
};

function detectStringKey(
  rows: Array<Record<string, ExplorerBarChartValue>>,
  keys?: string[],
) {
  const sample = rows[0];

  if (!sample) return null;

  for (const key of keys ?? []) {
    if (key in sample) return key;
  }

  return (
    Object.entries(sample).find(([, value]) => typeof value === "string")?.[0] ??
    null
  );
}

function detectNumericKey(
  rows: Array<Record<string, ExplorerBarChartValue>>,
  keys?: string[],
) {
  const sample = rows[0];

  if (!sample) return null;

  for (const key of keys ?? []) {
    if (typeof sample[key] === "number") return key;
  }

  return (
    Object.entries(sample).find(([, value]) => typeof value === "number")?.[0] ??
    null
  );
}

function formatValue(value: number, format: ExplorerBarChartValueFormat) {
  if (format === "currency") {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (format === "percentage") {
    return new Intl.NumberFormat("es-ES", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  }

  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisValue(value: number, format: ExplorerBarChartValueFormat) {
  const suffix = format === "currency" ? " US$" : format === "percentage" ? "%" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value / 1_000_000)} M${suffix}`;
  }

  if (absoluteValue >= 1_000) {
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value / 1_000)} mil${suffix}`;
  }

  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

export function ExplorerBarChart({
  title,
  rows,
  labelKeys,
  valueKeys,
  valueLabel = "Valor",
  valueFormat = "number",
  maxItems = 10,
}: ExplorerBarChartProps) {
  const labelKey = detectStringKey(rows, labelKeys);
  const valueKey = detectNumericKey(rows, valueKeys);
  const data =
    labelKey && valueKey
      ? rows
          .map((row) => ({
            name: String(row[labelKey] ?? "—"),
            value: Number(row[valueKey]),
          }))
          .filter((item) => Number.isFinite(item.value))
          .slice(0, maxItems)
      : [];
  const chartHeight = Math.max(360, data.length * 44 + 90);

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{valueLabel}</p>
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="w-full px-3 py-5 sm:px-5" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 32, bottom: 24, left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => formatAxisValue(Number(value), valueFormat)}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [
                  formatValue(Number(value), valueFormat),
                  valueLabel,
                ]}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              />
              <Bar dataKey="value" name={valueLabel} fill="#334155" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
