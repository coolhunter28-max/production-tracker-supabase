import type { ReactNode } from "react";

type AnalyticsTableDensity = "compact" | "comfortable";

type AnalyticsTableVariant =
  | "default"
  | "operational"
  | "executive"
  | "risk";

type AnalyticsTableShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  rowCount?: number;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  density?: AnalyticsTableDensity;
  variant?: AnalyticsTableVariant;
  maxHeightClassName?: string;
};

function getVariantClasses(variant: AnalyticsTableVariant) {
  switch (variant) {
    case "operational":
      return {
        section: "bg-white",
        header: "bg-white",
        toolbar: "bg-slate-50/70",
        title: "text-slate-950",
        description: "text-slate-500",
        badge: "bg-slate-50 text-slate-500",
        fade: "from-white",
      };

    case "executive":
      return {
        section: "bg-white",
        header: "bg-white",
        toolbar: "bg-white",
        title: "text-slate-950",
        description: "text-slate-500",
        badge: "bg-white text-slate-500",
        fade: "from-white",
      };

    case "risk":
      return {
        section: "bg-white ring-1 ring-rose-100",
        header: "bg-rose-50/30",
        toolbar: "bg-rose-50/40",
        title: "text-slate-950",
        description: "text-slate-600",
        badge: "bg-white text-rose-600",
        fade: "from-white",
      };

    default:
      return {
        section: "bg-white",
        header: "bg-white",
        toolbar: "bg-slate-50/60",
        title: "text-slate-900",
        description: "text-slate-500",
        badge: "bg-slate-50 text-slate-500",
        fade: "from-white",
      };
  }
}

export function AnalyticsTableShell({
  title,
  description,
  actions,
  toolbar,
  children,
  rowCount,
  empty = false,
  emptyTitle = "No hay datos para mostrar",
  emptyDescription = "Ajusta los filtros o cambia el contexto para ver resultados.",
  density = "compact",
  variant = "default",
  maxHeightClassName = "max-h-[640px]",
}: AnalyticsTableShellProps) {
  const densityClass = density === "compact" ? "text-sm" : "text-base";
  const variantClasses = getVariantClasses(variant);

  const hasHeader =
    title || description || actions || toolbar || rowCount !== undefined;

  return (
    <section
      className={`overflow-hidden rounded-2xl border shadow-sm ${variantClasses.section}`}
    >
      {hasHeader ? (
        <div className="border-b">
          <div
            className={`flex flex-wrap items-start justify-between gap-4 px-5 py-4 ${variantClasses.header}`}
          >
            <div className="min-w-0">
              {title ? (
                <h2
                  className={`text-base font-semibold ${variantClasses.title}`}
                >
                  {title}
                </h2>
              ) : null}

              {description ? (
                <p className={`mt-1 text-sm ${variantClasses.description}`}>
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {rowCount !== undefined ? (
                <div
                  className={`rounded-full border px-3 py-1 text-xs ${variantClasses.badge}`}
                >
                  {rowCount} filas
                </div>
              ) : null}

              {actions ? <div>{actions}</div> : null}
            </div>
          </div>

          {toolbar ? (
            <div
              className={`border-t px-5 py-2 ${variantClasses.toolbar}`}
            >
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}

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
        <div className="relative">
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-gradient-to-r ${variantClasses.fade} to-transparent`}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-gradient-to-l ${variantClasses.fade} to-transparent`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-4 bg-gradient-to-b ${variantClasses.fade} to-transparent`}
          />

          <div
            className={`${maxHeightClassName} overflow-auto ${densityClass}`}
          >
            {children}
          </div>
        </div>
      )}
    </section>
  );
}