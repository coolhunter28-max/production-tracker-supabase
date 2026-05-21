type AnalyticsEmptyStateProps = {
  title?: string;
  description?: string;
};

export function AnalyticsEmptyState({
  title = "No hay datos disponibles",
  description = "No existen resultados para los filtros actuales.",
}: AnalyticsEmptyStateProps) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}