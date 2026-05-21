import { AnalyticsLoadingState } from "@/components/analytics/analytics-loading-state";

export default function ClientesLoading() {
  return (
    <div className="space-y-4">
      <AnalyticsLoadingState rows={4} />
      <AnalyticsLoadingState rows={8} />
    </div>
  );
}