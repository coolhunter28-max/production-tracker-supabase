import type { ReactNode } from "react";

type AnalyticsTableShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AnalyticsTableShell({
  title,
  description,
  actions,
  children,
}: AnalyticsTableShellProps) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {(title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
          <div>
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

          {actions ? <div>{actions}</div> : null}
        </div>
      )}

      <div className="max-h-[640px] overflow-auto">
        {children}
      </div>
    </section>
  );
}