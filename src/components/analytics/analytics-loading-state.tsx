type AnalyticsLoadingStateProps = {
    rows?: number;
  };
  
  export function AnalyticsLoadingState({ rows = 4 }: AnalyticsLoadingStateProps) {
    return (
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-5 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
        </div>
  
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }