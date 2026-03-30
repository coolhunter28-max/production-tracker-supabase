"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type OperacionesSeasonsFiltersBarProps = {
  seasons: string[];
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

  // eliminamos filtros que no aplican a esta pantalla v1
  params.delete("customer");
  params.delete("factory");
  params.delete("operativa");
  params.delete("dateType");
  params.delete("dateFrom");
  params.delete("dateTo");
  params.delete("page");

  return params.toString();
}

export function OperacionesSeasonsFiltersBar({
  seasons,
}: OperacionesSeasonsFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useMemo(
    () => ({
      season: searchParams.get("season") ?? "",
    }),
    [searchParams]
  );

  function updateFilter(value: string) {
    const query = buildQueryString(searchParams, { season: value });
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
            Season
          </label>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={current.season}
            onChange={(e) => updateFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}