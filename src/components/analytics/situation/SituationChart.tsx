"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SituationChartType, SituationMetric } from "@/types/situation";

type Row = {
  label: string;
  value: number;
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#db2777",
  "#059669",
];

const metricLabels: Record<SituationMetric, string> = {
  sales: "Sales $",
  contribution: "Contribution $",
  qty: "Quantity",
};

function formatValue(metric: SituationMetric, value: number) {
  if (metric === "qty") return value.toLocaleString("es-ES");

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M US$`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K US$`;
  }

  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 0 })} US$`;
}

export function SituationChart({
  rows,
  metric,
  chart,
}: {
  rows: Row[];
  metric: SituationMetric;
  chart: SituationChartType;
}) {
  const dataKey = metricLabels[metric];

  const data = rows.map((row) => ({
    name: row.label,
    [dataKey]: row.value,
  }));

  if (chart === "donut") {
    return (
      <div className="h-[560px] w-full rounded-xl border bg-background p-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
            <Tooltip formatter={(value) => formatValue(metric, Number(value))} />
            <Legend verticalAlign="bottom" height={72} />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="name"
              innerRadius={95}
              outerRadius={180}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${(Number(percent) * 100).toFixed(1)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart === "line") {
    return (
      <div className="h-[560px] w-full rounded-xl border bg-background p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 30, right: 40, left: 70, bottom: 95 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              width={80}
              tickFormatter={(value) => formatValue(metric, Number(value))}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(value) => formatValue(metric, Number(value))} />
            <Legend verticalAlign="bottom" height={40} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[560px] w-full rounded-xl border bg-background p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 40, left: 70, bottom: 95 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            interval={0}
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            width={80}
            tickFormatter={(value) => formatValue(metric, Number(value))}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => formatValue(metric, Number(value))} />
          <Legend verticalAlign="bottom" height={40} />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}