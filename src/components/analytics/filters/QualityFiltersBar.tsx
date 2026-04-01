"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type QualityFiltersBarProps = {
  customers: string[];
  factories: string[];
  styles: string[];
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

  params.delete("season");
  params.delete("operativa");
  params.delete("dateType");
  params.delete("dateFrom");
  params.delete("dateTo");
  params.delete("page");

  return params.toString();
}

export function QualityFiltersBar({
  customers,
  factories,
  styles,
}: QualityFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useMemo(
    () => ({
      customer: searchParams.get("customer") ?? "",
      factory: searchParams.get("factory") ?? "",
      style: searchParams.get("style") ?? "",
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
          className="rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            Style
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.style}
            onChange={(e) => updateFilter("style", e.target.value)}
          >
            <option value="">Todos</option>
            {styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}