"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ExplorerLineChartRow = {
  label: string;
  value: number;
};

type ExplorerLineChartProps = {
  title: string;
  rows: ExplorerLineChartRow[];
  valueLabel?: string;
};

function formatValue(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisValue(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} M US$`;
  }

  if (absoluteValue >= 1_000) {
    return `${new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 0,
    }).format(value / 1_000)} mil US$`;
  }

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(value)} US$`;
}

export function ExplorerLineChart({
  title,
  rows,
  valueLabel = "Ventas",
}: ExplorerLineChartProps) {
  const data = rows.filter((row) => Number.isFinite(row.value));

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Evolución por campaña
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
          No hay datos para mostrar.
        </div>
      ) : (
        <div className="h-[420px] w-full px-3 py-5 sm:px-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 32, bottom: 20, left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tickFormatter={(value) => formatAxisValue(Number(value))}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={90}
              />

              <Tooltip
                formatter={(value) => [
                  formatValue(Number(value)),
                  valueLabel,
                ]}
              />

              <Line
                type="monotone"
                dataKey="value"
                name={valueLabel}
                stroke="#334155"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}