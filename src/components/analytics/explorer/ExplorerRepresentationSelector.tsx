import Link from "next/link";

import {
  EXPLORER_REPRESENTATION_LABELS,
  type ExplorerRepresentationMode,
  type ExplorerRepresentationPlan,
} from "@/lib/analytics/explorer/representation";

type ExplorerRepresentationSelectorProps = {
  plan: ExplorerRepresentationPlan;
  hrefs: Record<ExplorerRepresentationMode, string>;
};

export function ExplorerRepresentationSelector({
  plan,
  hrefs,
}: ExplorerRepresentationSelectorProps) {
  return (
    <div className="print:hidden">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Cambiar representación
      </p>

      <div className="flex flex-wrap gap-2">
        {plan.availableModes.map((mode) => (
          <Link
            key={mode}
            href={hrefs[mode]}
            className={
              mode === plan.mode
                ? "inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white"
                : "inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm font-medium transition hover:bg-slate-50"
            }
          >
            {EXPLORER_REPRESENTATION_LABELS[mode]}
          </Link>
        ))}
      </div>
    </div>
  );
}
