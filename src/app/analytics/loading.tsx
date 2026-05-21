import { AnalyticsLoadingState } from "@/components/analytics/analytics-loading-state";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-4">
      <AnalyticsLoadingState rows={5} />
      <AnalyticsLoadingState rows={4} />
      <AnalyticsLoadingState rows={6} />
    </div>
  );
}