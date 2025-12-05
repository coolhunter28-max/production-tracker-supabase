"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import FiltersBox from "@/components/dashboard/FiltersBox";
import POsTable from "@/components/dashboard/POsTable";
import Link from "next/link";
import { PO } from "@/types";

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  customer: "todos",
  supplier: "todos",
  factory: "todos",
  season: "todos",
  style: "todos",
  search: "",
};

export default function POsPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // -----------------------------------------------------
  // Load POs
  // -----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const data = await fetchPOs();
      setPOs(data);
      setFilteredPOs(data);
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

    if (filters.search)
      result = result.filter(
        (p) =>
          test(p.po) ||
          test(p.customer) ||
          test(p.supplier) ||
          test(p.factory) ||
          test(p.season)
      );

    setFilteredPOs(result);
  }, [filters, pos]);

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

          {/* ✅ RUTA CORRECTA */}
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
        styles={[]} // por ahora vacío
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* TABLE */}
      <POsTable pos={filteredPOs} />
    </div>
  );
}
