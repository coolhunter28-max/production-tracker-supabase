"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type OperacionesCustomersFiltersBarProps = {
  customers: string[];
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
  params.delete("factory");
  params.delete("operativa");
  params.delete("dateType");
  params.delete("dateFrom");
  params.delete("dateTo");
  params.delete("page");

  return params.toString();
}

export function OperacionesCustomersFiltersBar({
  customers,
}: OperacionesCustomersFiltersBarProps) {
  const router = useRouter();

  const pathname = usePathname();
  const safePathname = pathname ?? "";

  const searchParams = useSearchParams();

  const safeSearchParams = useMemo(
    () => new URLSearchParams(searchParams?.toString() ?? ""),
    [searchParams]
  );

  const current = useMemo(
    () => ({
      customer: safeSearchParams.get("customer") ?? "",
    }),
    [safeSearchParams]
  );

  function updateFilter(value: string) {
    const query = buildQueryString(safeSearchParams, { customer: value });
    router.push(query ? `${safePathname}?${query}` : safePathname);
  }

  function clearFilters() {
    router.push(safePathname);
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
            onChange={(e) => updateFilter(e.target.value)}
          >
            <option value="">Todos</option>

            {customers.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}