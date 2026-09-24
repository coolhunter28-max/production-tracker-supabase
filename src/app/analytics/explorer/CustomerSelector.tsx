"use client";

import { useRouter } from "next/navigation";

type CustomerSelectorProps = {
  customers: string[];
  selectedCustomer?: string;
  area: string;
  concept: string;
  perspective: string;
  context: string;
  season?: string;
};

export function CustomerSelector({
  customers,
  selectedCustomer,
  area,
  concept,
  perspective,
  context,
  season,
}: CustomerSelectorProps) {
  const router = useRouter();

  const handleChange = (customer: string) => {
    const params = new URLSearchParams({
      area,
      concept,
      perspective,
      context,
    });

    if (season) {
      params.set("season", season);
    }

    if (customer) {
      params.set("customer", customer);
    }

    router.push(`/analytics/explorer?${params.toString()}`);
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm print:hidden">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>

        <h2 className="mt-1 text-lg font-semibold">
          ¿Quieres aislar un cliente?
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Mantén «Todos los clientes» para ver el ranking completo o selecciona
          uno para analizarlo de forma aislada.
        </p>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">
          Cliente seleccionado
        </span>

        <select
          value={selectedCustomer ?? ""}
          onChange={(event) => handleChange(event.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos los clientes</option>

          {customers.map((customer) => (
            <option key={customer} value={customer}>
              {customer}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}