import Link from "next/link";
import type { OperacionesFilters } from "@/lib/analytics/types/operaciones";

type OperacionesFocusBoardProps = {
  logisticsRows: Array<Record<string, string | number | boolean | null>>;
  factoryRows: Array<Record<string, string | number | boolean | null>>;
  filters: OperacionesFilters;
};

function toText(value: unknown) {
  if (value === null || value === undefined) return "—";
  return String(value);
}

function toNumber(value: unknown) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function formatNumber(value: number | null, decimals = 2) {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function buildBaseParams(filters: OperacionesFilters) {
  const params = new URLSearchParams();
  if (filters.season) params.set("season", filters.season);
  if (filters.operativa) params.set("operativa", filters.operativa);
  if (filters.dateType) params.set("dateType", filters.dateType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params;
}

function buildOperationsCustomerHref(customer: string, filters: OperacionesFilters) {
  const params = buildBaseParams(filters);
  params.set("customer", customer);
  return `/analytics/operaciones/customers?${params.toString()}`;
}

function buildOperationsFactoryHref(factory: string, filters: OperacionesFilters) {
  const params = buildBaseParams(filters);
  params.set("factory", factory);
  return `/analytics/operaciones/factories?${params.toString()}`;
}

export function OperacionesFocusBoard({
  logisticsRows,
  factoryRows,
  filters,
}: OperacionesFocusBoardProps) {
  const topLogistics = logisticsRows.slice(0, 5);
  const topFactories = factoryRows.slice(0, 5);

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Prioridad operativa</h2>
        <p className="text-sm text-muted-foreground">
          Cola ejecutiva desde rankings del cubo operativo.
        </p>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-xl border p-3">
          <div>
            <p className="text-sm font-medium">Clientes con presión logística</p>
            <p className="text-xs text-muted-foreground">
              Top por `vw_exec_customer_logistics_pressure_ranking`.
            </p>
          </div>

          {topLogistics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <div className="space-y-2">
              {topLogistics.map((row, index) => {
                const customer = toText(row.customer);
                const score = toNumber(row.logistics_pressure_score);
                const bookingDelayRate = toNumber(row.booking_delay_rate_pct);

                return (
                  <Link
                    key={`${customer}-${index}`}
                    href={buildOperationsCustomerHref(customer, filters)}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{customer}</p>
                      <span className="text-xs text-muted-foreground">
                        Score {formatNumber(score)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Booking delay: {formatNumber(bookingDelayRate)}%
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground underline">
                      Ver detalle customer
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border p-3">
          <div>
            <p className="text-sm font-medium">Fábricas con mayor riesgo</p>
            <p className="text-xs text-muted-foreground">
              Top por `vw_exec_factory_ranking`.
            </p>
          </div>

          {topFactories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <div className="space-y-2">
              {topFactories.map((row, index) => {
                const factory = toText(row.factory);
                const riskScore = toNumber(row.risk_score);
                const riskLevel = toText(row.risk_level);

                return (
                  <Link
                    key={`${factory}-${index}`}
                    href={buildOperationsFactoryHref(factory, filters)}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{factory}</p>
                      <span className="text-xs text-muted-foreground">
                        Score {formatNumber(riskScore)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nivel: {riskLevel}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
