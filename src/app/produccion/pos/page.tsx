"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import FiltersBox from "@/components/dashboard/FiltersBox";
import POsTable from "@/components/dashboard/POsTable";
import Link from "next/link";
import { PO } from "@/types";

import { getEstadoPO } from "@/utils/getEstadoPO";

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  estado: string;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  customer: "todos",
  supplier: "todos",
  factory: "todos",
  season: "todos",
  estado: "todos",
  search: "",
};

export default function POsPage() {
  const [pos, setPOs] = useState<any[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // -----------------------------------------------------
  // Load POs + calcular estado dinámico
  // -----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const data = await fetchPOs();

      // ⭐ Añadir estado calculado
      const enriched = data.map((po: any) => {
        const estadoInfo = getEstadoPO(po);
        return {
          ...po,
          estado: estadoInfo.estado ?? "Sin datos",
        };
      });

      setPOs(enriched);
      setFilteredPOs(enriched);
      setLoading(false);
    };

    load();
  }, []);

  // -----------------------------------------------------
  // Unique filter values
  // -----------------------------------------------------
  const customers = useMemo(
    () => [...new Set(pos.map((p) => p.customer).filter(Boolean))].sort(),
    [pos]
  );

  const suppliers = useMemo(
    () => [...new Set(pos.map((p) => p.supplier).filter(Boolean))].sort(),
    [pos]
  );

  const factories = useMemo(
    () => [...new Set(pos.map((p) => p.factory).filter(Boolean))].sort(),
    [pos]
  );

  const seasons = useMemo(
    () => [...new Set(pos.map((p) => p.season).filter(Boolean))].sort(),
    [pos]
  );

  const estados = useMemo(
    () =>
      [...new Set(pos.map((p) => p.estado).filter(Boolean))].sort(), // Delay / Finalizado / En producción / Sin datos
    [pos]
  );

  // -----------------------------------------------------
  // Apply filters
  // -----------------------------------------------------
  useEffect(() => {
    let result = pos;

    const test = (val?: string) =>
      (val || "").toLowerCase().includes(filters.search.toLowerCase());

    if (filters.customer !== "todos")
      result = result.filter((p) => p.customer === filters.customer);

    if (filters.supplier !== "todos")
      result = result.filter((p) => p.supplier === filters.supplier);

    if (filters.factory !== "todos")
      result = result.filter((p) => p.factory === filters.factory);

    if (filters.season !== "todos")
      result = result.filter((p) => p.season === filters.season);

    if (filters.estado !== "todos")
      result = result.filter((p) => p.estado === filters.estado);

    if (filters.search)
      result = result.filter(
        (p) =>
          test(p.po) ||
          test(p.customer) ||
          test(p.supplier) ||
          test(p.factory) ||
          test(p.season) ||
          test(p.estado)
      );

    setFilteredPOs(result);
  }, [filters, pos]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-10">Cargando...</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lista de Purchase Orders</h1>

        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
          >
            ← Inicio
          </Link>

          {/* Ruta correcta */}
          <Link
            href="/po/nuevo/editar"
            className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition"
          >
            + Nuevo PO
          </Link>
        </div>
      </div>

      {/* FILTERS */}
      <FiltersBox
        customers={customers}
        suppliers={suppliers}
        factories={factories}
        seasons={seasons}
        estados={estados}
        filters={filters}
        onChange={handleFilterChange}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* TABLE */}
      <POsTable pos={filteredPOs} />
    </div>
  );
}
