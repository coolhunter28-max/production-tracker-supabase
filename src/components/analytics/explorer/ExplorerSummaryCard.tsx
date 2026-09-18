import type {
  ExplorerSummaryItem,
} from "@/lib/analytics/explorer/types";
import type { AnalyticsKpi } from "@/lib/analytics/summary/analytics-kpi";
import type { CustomerKpiSummary } from "@/lib/analytics/summary/customer-kpi-summary";

type ExplorerSummaryCardProps = {
  summary: CustomerKpiSummary;
};

export function ExplorerSummaryCard({
  summary,
}: ExplorerSummaryCardProps) {
  const legacyItems = [
    summary.primary,
    summary.secondary,
    summary.tertiary,
  ];

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resumen ejecutivo
        </p>
        <h3 className="text-2xl font-semibold">
          Resumen ejecutivo
        </h3>
      </div>

      {summary.cards ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {summary.cards.map((card, index) => (
            <KpiCard
              key={`${card.label}-${index}`}
              card={card}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {legacyItems.map((item, index) => (
            <SummaryItem
              key={`${item.label}-${index}`}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function KpiCard({
  card,
}: {
  card: AnalyticsKpi;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm font-medium text-muted-foreground">
  {card.label}
  {card.periodLabel ? ` · ${card.periodLabel}` : ""}
</p>

      <p className="mt-2 break-words text-2xl font-semibold tracking-tight">
        {formatKpiValue(card)}
      </p>

      {card.comparisonValue !== undefined && (
        <p className="mt-2 text-sm text-muted-foreground">
          {card.comparisonPeriodLabel
  ? `Comparación · ${card.comparisonPeriodLabel}: `
  : "Comparación: "}
          {formatNumericValue(
            card.comparisonValue,
            card.format,
            card.currency,
          )}
        </p>
      )}

      {card.changeValue !== undefined && (
        <p className="mt-1 text-sm font-medium">
          Variación:{" "}
          {formatChangeValue(card)}
        </p>
      )}
    </div>
  );
}

function SummaryItem({
  item,
}: {
  item: ExplorerSummaryItem;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm font-medium text-muted-foreground">
        {item.label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight">
        {formatSummaryValue(item)}
      </p>
    </div>
  );
}

function formatKpiValue(
  card: AnalyticsKpi,
): string {
  return formatNumericValue(
    card.value,
    card.format,
    card.currency,
  );
}

function formatChangeValue(
  card: AnalyticsKpi,
): string {
  if (
    card.changeValue === null ||
    card.changeValue === undefined
  ) {
    return "Sin datos";
  }

  switch (card.changeFormat) {
    case "currency":
      return formatNumericValue(
        card.changeValue,
        "currency",
        card.currency,
      );

    case "percentage":
      return formatNumericValue(
        card.changeValue,
        "percentage",
      );

    case "percentage-points":
      return `${new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(card.changeValue)} pp`;

    default:
      return String(card.changeValue);
  }
}

function formatNumericValue(
  value: number | null,
  format: "currency" | "percentage" | "integer",
  currency?: string,
): string {
  if (value === null || value === undefined) {
    return "Sin datos";
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: currency ?? "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);

    case "percentage":
      return `${new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)} %`;

    case "integer":
      return new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 0,
      }).format(value);
  }
}

function formatSummaryValue(
  item: ExplorerSummaryItem,
): string {
  if (
    item.value === null ||
    item.value === undefined ||
    item.value === ""
  ) {
    return "Sin datos";
  }

  if (item.format === "text") {
    return String(item.value);
  }

  const numericValue =
    typeof item.value === "number"
      ? item.value
      : Number(item.value);

  if (!Number.isFinite(numericValue)) {
    return String(item.value);
  }

  switch (item.format) {
    case "currency":
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: item.currency ?? "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericValue);

    case "percentage":
      return `${new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericValue)} %`;

    case "integer":
      return new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 0,
      }).format(numericValue);

    default:
      return String(item.value);
  }
}
