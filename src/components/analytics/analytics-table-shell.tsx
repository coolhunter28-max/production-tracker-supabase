import type { ReactNode } from "react";

type AnalyticsTableDensity = "compact" | "comfortable";

type AnalyticsTableShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  rowCount?: number;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  density?: AnalyticsTableDensity;
  maxHeightClassName?: string;
};

export function AnalyticsTableShell({
  title,
  description,
  actions,
  children,
  rowCount,
  empty = false,
  emptyTitle = "No hay datos para mostrar",
  emptyDescription = "Ajusta los filtros o cambia el contexto para ver resultados.",
  density = "compact",
  maxHeightClassName = "max-h-[640px]",
}: AnalyticsTableShellProps) {
  const densityClass =
    density === "compact" ? "text-sm" : "text-base";

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {(title || description || actions || rowCount !== undefined) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rowCount !== undefined ? (
              <div className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-500">
                {rowCount} filas
              </div>
            ) : null}

            {actions ? <div>{actions}</div> : null}
          </div>
        </div>
      )}

      {empty ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            {emptyTitle}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div
          className={`${maxHeightClassName} overflow-auto ${densityClass}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}