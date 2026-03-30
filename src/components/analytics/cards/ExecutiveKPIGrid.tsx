"use client";

import { useState } from "react";
import type {
  ExecutiveKPIConfigItem,
  ExecutiveKPIDashboardRow,
} from "@/lib/analytics/types/executive";

type ExecutiveKPIGridProps = {
  rows: ExecutiveKPIDashboardRow[];
};

const KPI_CONFIG: ExecutiveKPIConfigItem[] = [
  { key: "po_count", label: "POs", format: "number" },
  { key: "line_count", label: "Líneas", format: "number" },
  { key: "customer_count", label: "Customers", format: "number" },
  { key: "factory_count", label: "Factories", format: "number" },
  { key: "model_count", label: "Modelos", format: "number" },
  { key: "qty_total", label: "Qty Total", format: "number" },
  { key: "sell_amount_total", label: "Sell Amount", format: "number" },
  { key: "buy_amount_total", label: "Buy Amount", format: "number" },
  { key: "margin_bsg_total", label: "Margin BSG", format: "number" },
  { key: "margin_xiamen_total", label: "Margin Xiamen", format: "number" },
  { key: "contribution_total", label: "Contribution", format: "number" },
  { key: "contribution_pct", label: "Contribution %", format: "percent" },
  { key: "xiamen_sales_mix_pct", label: "Mix Xiamen %", format: "percent" },
  { key: "bsg_sales_mix_pct", label: "Mix BSG %", format: "percent" },
  { key: "avg_delay_production_days", label: "Avg Delay Prod.", format: "number" },
  { key: "max_delay_production_days", label: "Max Delay Prod.", format: "number" },
  { key: "production_late_rate_pct", label: "Late Prod. %", format: "percent" },
  { key: "avg_booking_delay_days", label: "Avg Booking Delay", format: "number" },
  { key: "max_booking_delay_days", label: "Max Booking Delay", format: "number" },
  { key: "booking_delay_rate_pct", label: "Booking Delay %", format: "percent" },
  { key: "inspection_count", label: "Inspections", format: "number" },
  { key: "inspected_po_count", label: "POs Inspected", format: "number" },
  { key: "qty_inspected_total", label: "Qty Inspected", format: "number" },
  { key: "total_defects_found", label: "Defects Found", format: "number" },
  { key: "critical_found", label: "Critical", format: "number" },
  { key: "major_found", label: "Major", format: "number" },
  { key: "minor_found", label: "Minor", format: "number" },
  { key: "avg_defect_rate_pct", label: "Avg Defect %", format: "percent" },
  { key: "max_defect_rate_pct", label: "Max Defect %", format: "percent" },
  { key: "passed_inspections", label: "Passed", format: "number" },
  { key: "failed_inspections", label: "Failed", format: "number" },
  { key: "qc_fail_rate_pct", label: "QC Fail %", format: "percent" },
  { key: "inspections_with_critical", label: "With Critical", format: "number" },
  { key: "po_inspection_coverage_pct", label: "PO Coverage %", format: "percent" },
  { key: "operational_risk_score", label: "Risk Score", format: "number" },
  { key: "operational_risk_level", label: "Risk Level", format: "text" },
];

const PRIMARY_KPI_KEYS = [
  "po_count",
  "line_count",
  "customer_count",
  "factory_count",
  "qty_total",
  "sell_amount_total",
  "contribution_total",
  "contribution_pct",
  "avg_delay_production_days",
  "booking_delay_rate_pct",
  "qc_fail_rate_pct",
  "operational_risk_score",
  "operational_risk_level",
];

function formatValue(
  value: string | number | boolean | null | undefined,
  format: ExecutiveKPIConfigItem["format"] = "text"
) {
  if (value === null || value === undefined) return "—";

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (format === "percent" && typeof value === "number") {
    return (
      new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value) + "%"
    );
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

function KPICard({
  label,
  value,
  format,
  emphasize = false,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  format?: ExecutiveKPIConfigItem["format"];
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={emphasize ? "mt-2 text-3xl font-semibold" : "mt-2 text-2xl font-semibold"}>
        {formatValue(value, format)}
      </div>
    </div>
  );
}

export function ExecutiveKPIGrid({ rows }: ExecutiveKPIGridProps) {
  const [showSecondary, setShowSecondary] = useState(false);

  const row = rows[0];

  if (!row) {
    return (
      <div className="text-sm text-muted-foreground">
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
            label={item.label}
            value={row[item.key]}
            format={item.format}
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
              className="rounded-xl border px-3 py-2 text-sm"
            >
              {showSecondary ? "Ver menos" : `Ver más (${secondaryItems.length})`}
            </button>
          </div>

          {showSecondary ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {secondaryItems.map((item) => (
                <KPICard
                  key={item.key}
                  label={item.label}
                  value={row[item.key]}
                  format={item.format}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}