"use client";

import React from "react";

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  estado: string;
  search: string;
};

type Props = {
  customers: string[];
  suppliers: string[];
  factories: string[];
  seasons: string[];
  styles: string[];
  filters: Filters;
  onChange: React.Dispatch<React.SetStateAction<Filters>> | ((next: any) => void);
  onClear: () => void;
};

export default function FiltersBox({
  customers,
  suppliers,
  factories,
  seasons,
  styles,
  filters,
  onChange,
  onClear,
}: Props) {
  // ✅ helper: siempre actualiza con updater (nunca manda el evento al parent)
  const setField = (key: keyof Filters, value: string) => {
    const v = String(value ?? "");
    if (typeof onChange === "function") {
      (onChange as any)((prev: Filters) => ({ ...prev, [key]: v }));
    }
  };

  const safe = (v: any) => String(v ?? "");

  // Opciones de estado (ajusta si tus labels exactas difieren)
  const estadoOptions = [
    "todos",
    "Pendiente",
    "Enviado",
    "Confirmado",
    "Producción",
    "Shipment",
    "Finalizado",
    "Cancelado",
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold">Filtros</h2>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Customer */}
        <div>
          <label className="text-sm font-medium">Customer</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.customer) || "todos"}
            onChange={(e) => setField("customer", e.target.value)}
          >
            <option value="todos">Todos</option>
            {customers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier */}
        <div>
          <label className="text-sm font-medium">Supplier</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.supplier) || "todos"}
            onChange={(e) => setField("supplier", e.target.value)}
          >
            <option value="todos">Todos</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Factory */}
        <div>
          <label className="text-sm font-medium">Factory</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.factory) || "todos"}
            onChange={(e) => setField("factory", e.target.value)}
          >
            <option value="todos">Todos</option>
            {factories.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Season */}
        <div>
          <label className="text-sm font-medium">Season</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.season) || "todos"}
            onChange={(e) => setField("season", e.target.value)}
          >
            <option value="todos">Todas</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="text-sm font-medium">Estado</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.estado) || "todos"}
            onChange={(e) => setField("estado", e.target.value)}
          >
            <option value="todos">Todos</option>
            {estadoOptions
              .filter((x) => x !== "todos")
              .map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
          </select>
        </div>

        {/* Buscar */}
        <div>
          <label className="text-sm font-medium">Buscar</label>
          <input
            className="w-full border px-3 py-2 rounded"
            value={safe(filters.search)}
            onChange={(e) => setField("search", e.target.value)}
            placeholder="PO / customer / supplier / style..."
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
