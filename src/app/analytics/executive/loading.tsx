import { AnalyticsLoadingState } from "@/components/analytics/analytics-loading-state";

export default function ExecutiveLoading() {
  return (
    <div className="space-y-4">
      <AnalyticsLoadingState rows={3} />
      <AnalyticsLoadingState rows={4} />
      <AnalyticsLoadingState rows={6} />
    </div>
  );
}