import { SituationChart } from "@/components/analytics/situation/SituationChart";
import {
  formatSituationValue,
  getSituationChartData,
  getSituationFilterOptions,
  parseSituationSearchParams,
  situationChartLabels,
  situationDimensionLabels,
  situationMetricLabels,
} from "@/lib/analytics/situation";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

const metrics = ["sales", "contribution", "qty"] as const;
const dimensions = ["customer", "factory", "season", "operativa"] as const;
const charts = ["bar", "donut", "line"] as const;

export default async function SituationAnalyticsPage({
  searchParams,
}: PageProps) {
  const filters = parseSituationSearchParams(searchParams);
  const [rows, options] = await Promise.all([
    getSituationChartData(filters),
    getSituationFilterOptions(),
  ]);

  const total = rows.reduce((acc, row) => acc + row.value, 0);
  const top = rows[0];

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visual Pivot Explorer
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Situation Analytics
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Explora visualmente ventas, contribución y cantidades con agrupación
            dinámica y filtros múltiples.
          </p>
        </div>

        <form className="space-y-4" method="GET">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <SelectField name="metric" label="Metric" value={filters.metric}>
              {metrics.map((metric) => (
                <option key={metric} value={metric}>
                  {situationMetricLabels[metric]}
                </option>
              ))}
            </SelectField>

            <SelectField name="dimension" label="Group by" value={filters.dimension}>
              {dimensions.map((dimension) => (
                <option key={dimension} value={dimension}>
                  {situationDimensionLabels[dimension]}
                </option>
              ))}
            </SelectField>

            <SelectField name="chart" label="Chart" value={filters.chart}>
              {charts.map((chart) => (
                <option
                  key={chart}
                  value={chart}
                  disabled={chart === "line" && filters.dimension !== "season"}
                >
                  {situationChartLabels[chart]}
                  {chart === "line" && filters.dimension !== "season"
                    ? " · only Season"
                    : ""}
                </option>
              ))}
            </SelectField>

            <div className="flex items-end">
              <button
                type="submit"
                className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <MultiSelectField
              name="customers"
              label="Customers"
              values={filters.customers}
              options={options.customers}
            />
            <MultiSelectField
              name="factories"
              label="Factories"
              values={filters.factories}
              options={options.factories}
            />
            <MultiSelectField
              name="seasons"
              label="Seasons"
              values={filters.seasons}
              options={options.seasons}
            />
            <MultiSelectField
              name="operativas"
              label="Operativas"
              values={filters.operativas}
              options={options.operativas}
            />
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h2 className="text-lg font-semibold">
              {situationMetricLabels[filters.metric]} by{" "}
              {situationDimensionLabels[filters.dimension]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} groups · total{" "}
              {formatSituationValue(filters.metric, total)}
            </p>
          </div>

          <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            Top: {top?.label ?? "—"}{" "}
            {top ? `· ${formatSituationValue(filters.metric, top.value)}` : ""}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No hay datos para esta combinación.
          </div>
        ) : (
          <SituationChart rows={rows} metric={filters.metric} chart={filters.chart} />
        )}
      </section>
    </main>
  );
}

function SelectField({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function MultiSelectField({
  name,
  label,
  values,
  options,
}: {
  name: string;
  label: string;
  values: string[];
  options: string[];
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        multiple
        defaultValue={values}
        className="h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}