import type { ReactNode } from "react";

type AnalyticsSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AnalyticsSection({
  title,
  description,
  actions,
  children,
}: AnalyticsSectionProps) {
  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}