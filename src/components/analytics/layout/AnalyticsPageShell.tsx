import type { ReactNode } from "react";

type AnalyticsPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AnalyticsPageShell({
  title,
  description,
  children,
}: AnalyticsPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}