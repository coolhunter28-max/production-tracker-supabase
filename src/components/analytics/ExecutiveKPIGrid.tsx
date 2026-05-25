"use client";

import { useState } from "react";

import { AnalyticsKpiCard } from "@/components/analytics/analytics-kpi-card";

import type {
  ExecutiveKPIConfigItem,
  ExecutiveKPIDashboardRow,
} from "@/lib/analytics/types/executive";

type ExecutiveKPIGridProps = {
  rows: ExecutiveKPIDashboardRow[];
};

type KpiVariant = "default" | "success" | "warning" | "critical" | "muted";

const KPI_CONFIG: ExecutiveKPIConfigItem[] = [
  { key: "po_count", label: "POs", format: "number" },
  { key: "line_count", label: "Líneas", format: "number" },
  { key: "customer_count", label: "Customers", format: "number" },
  { key: "factory_count", label: "Factories", format: "number" },
  { key: "qty_total", label: "Qty Total", format: "number" },
  { key: "sell_amount_total", label: "Sell Amount", format: "number" },
  { key: "contribution_total", label: "Contribution", format: "number" },
  { key: "contribution_pct", label: "Contribution %", format: "percent" },
  {
    key: "avg_delay_production_days",
    label: "Avg Delay Prod.",
    format: "number",
  },
  {
    key: "production_late_rate_pct",
    label: "Late Prod. %",
    format: "percent",
  },
  {
    key: "booking_delay_rate_pct",
    label: "Booking Delay %",
    format: "percent",
  },
  { key: "avg_defect_rate_pct", label: "Avg Defect %", format: "percent" },
  { key: "qc_fail_rate_pct", label: "QC Fail %", format: "percent" },
];

const PRIMARY_KPI_KEYS = [
  "sell_amount_total",
  "contribution_total",
  "contribution_pct",
  "po_count",
  "customer_count",
  "factory_count",
  "avg_delay_production_days",
  "production_late_rate_pct",
  "booking_delay_rate_pct",
  "avg_defect_rate_pct",
  "qc_fail_rate_pct",
];

function formatValue(
  value: string | number | boolean | null | undefined,
  format: ExecutiveKPIConfigItem["format"] = "text"
) {
  if (value === null || value === undefined) return "—";

  if (typeof value === "boolean") return value ? "Sí" : "No";

  if (format === "percent" && typeof value === "number") {
    return `${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)}%`;
  }

  if (format === "number" && typeof value === "number") {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return String(value);
}

function getVisibleItems(row: ExecutiveKPIDashboardRow) {
  return KPI_CONFIG.filter((item) => item.key in row);
}

function getPrimaryItems(items: ExecutiveKPIConfigItem[]) {
  return items.filter((item) => PRIMARY_KPI_KEYS.includes(item.key));
}

function getSecondaryItems(items: ExecutiveKPIConfigItem[]) {
  return items.filter((item) => !PRIMARY_KPI_KEYS.includes(item.key));
}

function getKpiVariant(
  key: string,
  value: string | number | boolean | null | undefined
): KpiVariant {
  if (value === null || value === undefined) return "muted";
  if (typeof value !== "number") return "default";

  if (
    key === "qc_fail_rate_pct" ||
    key === "avg_defect_rate_pct"
  ) {
    if (value >= 10) return "critical";
    if (value > 0) return "warning";
    return "success";
  }

  if (
    key === "avg_delay_production_days" ||
    key === "production_late_rate_pct" ||
    key === "booking_delay_rate_pct"
  ) {
    if (value >= 25) return "critical";
    if (value >= 10) return "warning";
    return "success";
  }

  if (key === "contribution_pct") {
    if (value >= 20) return "success";
    if (value >= 10) return "default";
    return "warning";
  }

  return "default";
}

function getKpiSubtitle(
  key: string,
  value: string | number | boolean | null | undefined
) {
  if (value === null || value === undefined) return "Sin dato";

  if (key.includes("delay") || key.includes("late")) return "Operational pressure";
  if (key.includes("fail") || key.includes("defect")) return "Quality signal";
  if (key.includes("contribution")) return "Business performance";
  if (key.includes("count")) return "Operational volume";

  return undefined;
}

function KPICard({
  item,
  value,
  emphasize = false,
}: {
  item: ExecutiveKPIConfigItem;
  value: string | number | boolean | null | undefined;
  emphasize?: boolean;
}) {
  return (
    <AnalyticsKpiCard
      title={item.label}
      value={formatValue(value, item.format)}
      subtitle={getKpiSubtitle(item.key, value)}
      variant={getKpiVariant(item.key, value)}
      compact={!emphasize}
    />
  );
}

export function ExecutiveKPIGrid({ rows }: ExecutiveKPIGridProps) {
  const [showSecondary, setShowSecondary] = useState(false);

  const row = rows[0];

  if (!row) {
    return (
      <div className="rounded-2xl border bg-slate-50 p-6 text-sm text-muted-foreground">
        No hay datos en <code>vw_exec_kpi_dashboard</code>.
      </div>
    );
  }

  const visibleItems = getVisibleItems(row);
  const primaryItems = getPrimaryItems(visibleItems);
  const secondaryItems = getSecondaryItems(visibleItems);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryItems.map((item) => (
          <KPICard
            key={item.key}
            item={item}
            value={row[item.key]}
            emphasize
          />
        ))}
      </div>

      {secondaryItems.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-muted-foreground">
              KPIs secundarios
            </div>

            <button
              type="button"
              onClick={() => setShowSecondary((prev) => !prev)}
              className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              {showSecondary
                ? "Ver menos"
                : `Ver más (${secondaryItems.length})`}
            </button>
          </div>

          {showSecondary ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {secondaryItems.map((item) => (
                <KPICard
                  key={item.key}
                  item={item}
                  value={row[item.key]}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}