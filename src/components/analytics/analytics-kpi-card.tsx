import type { ReactNode } from "react";

type AnalyticsKpiVariant =
  | "default"
  | "success"
  | "warning"
  | "critical"
  | "muted";

type AnalyticsKpiCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  trend?: ReactNode;
  icon?: ReactNode;
  variant?: AnalyticsKpiVariant;
  compact?: boolean;
};

function getVariantClasses(variant: AnalyticsKpiVariant) {
  switch (variant) {
    case "success":
      return {
        card: "border-emerald-200 bg-emerald-50/40",
        title: "text-emerald-700",
        value: "text-emerald-950",
      };

    case "warning":
      return {
        card: "border-amber-200 bg-amber-50/40",
        title: "text-amber-700",
        value: "text-amber-950",
      };

    case "critical":
      return {
        card: "border-rose-200 bg-rose-50/40",
        title: "text-rose-700",
        value: "text-rose-950",
      };

    case "muted":
      return {
        card: "border-slate-200 bg-slate-50/60",
        title: "text-slate-500",
        value: "text-slate-800",
      };

    default:
      return {
        card: "border bg-background",
        title: "text-muted-foreground",
        value: "text-foreground",
      };
  }
}

export function AnalyticsKpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
  compact = false,
}: AnalyticsKpiCardProps) {
  const classes = getVariantClasses(variant);

  return (
    <div
      className={`rounded-2xl shadow-sm ${classes.card} ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-sm ${classes.title}`}>
            {title}
          </div>

          <div
            className={`mt-2 font-semibold ${classes.value} ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            {value}
          </div>
        </div>

        {icon ? (
          <div className="shrink-0 rounded-xl border bg-white/70 p-2 text-slate-500">
            {icon}
          </div>
        ) : null}
      </div>

      {(subtitle || trend) ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {subtitle ? <div>{subtitle}</div> : <div />}

          {trend ? <div>{trend}</div> : null}
        </div>
      ) : null}
    </div>
  );
}