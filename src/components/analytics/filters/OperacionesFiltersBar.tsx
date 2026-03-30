"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type OperacionesFiltersBarProps = {
  seasons: string[];
  customers: string[];
  factories: string[];
};

function buildQueryString(
  searchParams: URLSearchParams,
  updates: Record<string, string>
) {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  params.delete("page");

  return params.toString();
}

export function OperacionesFiltersBar({
  seasons,
  customers,
  factories,
}: OperacionesFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useMemo(
    () => ({
      season: searchParams.get("season") ?? "",
      customer: searchParams.get("customer") ?? "",
      factory: searchParams.get("factory") ?? "",
      dateType: searchParams.get("dateType") ?? "shipping",
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
    }),
    [searchParams]
  );

  function updateFilter(name: string, value: string) {
    const query = buildQueryString(searchParams, { [name]: value });
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-medium">Filtros</h2>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Season
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.season}
            onChange={(e) => updateFilter("season", e.target.value)}
          >
            <option value="">Todas</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Customer
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.customer}
            onChange={(e) => updateFilter("customer", e.target.value)}
          >
            <option value="">Todos</option>
            {customers.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Factory
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.factory}
            onChange={(e) => updateFilter("factory", e.target.value)}
          >
            <option value="">Todas</option>
            {factories.map((factory) => (
              <option key={factory} value={factory}>
                {factory}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Tipo de fecha
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.dateType}
            onChange={(e) => updateFilter("dateType", e.target.value)}
          >
            <option value="shipping">Shipping</option>
            <option value="finish">Finish</option>
            <option value="pi_etd">PI ETD</option>
            <option value="po">PO</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Desde
          </label>
          <input
            type="date"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Hasta
          </label>
          <input
            type="date"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}