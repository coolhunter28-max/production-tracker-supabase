import type {
  ExplorerSummary,
  ExplorerSummaryItem,
} from "@/lib/analytics/explorer/types";

type ExplorerSummaryCardProps = {
  summary: ExplorerSummary;
};

export function ExplorerSummaryCard({
  summary,
}: ExplorerSummaryCardProps) {
  const items = [
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

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <SummaryItem
            key={`${item.label}-${index}`}
            item={item}
          />
        ))}
      </div>
    </section>
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