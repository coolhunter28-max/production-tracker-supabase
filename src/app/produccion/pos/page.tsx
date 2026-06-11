"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import FiltersBox from "@/components/dashboard/FiltersBox";
import POsTable from "@/components/dashboard/POsTable";
import Link from "next/link";
import { getEstadoPO } from "@/utils/getEstadoPO";

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  estado: string;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  customer: "todos",
  supplier: "todos",
  factory: "todos",
  season: "todos",
  style: "",
  estado: "todos",
  search: "",
};

export default function POsPage() {
  const [pos, setPOs] = useState<any[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const load = async () => {
      const data = await fetchPOs();

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

  const styles = useMemo(
    () =>
      [
        ...new Set(
          pos
            .flatMap((p) => p.lineas_pedido ?? [])
            .map((line: any) => line.style)
            .filter(Boolean)
        ),
      ].sort(),
    [pos]
  );

  const estados = useMemo(
    () => [...new Set(pos.map((p) => p.estado).filter(Boolean))].sort(),
    [pos]
  );

  useEffect(() => {
    let result = pos;

    const test = (val?: string | null) =>
      String(val ?? "").toLowerCase().includes(filters.search.toLowerCase());

    if (filters.customer !== "todos") {
      result = result.filter((p) => p.customer === filters.customer);
    }

    if (filters.supplier !== "todos") {
      result = result.filter((p) => p.supplier === filters.supplier);
    }

    if (filters.factory !== "todos") {
      result = result.filter((p) => p.factory === filters.factory);
    }

    if (filters.season !== "todos") {
      result = result.filter((p) => p.season === filters.season);
    }

    if (filters.estado !== "todos") {
      result = result.filter((p) => p.estado === filters.estado);
    }

    if (filters.style) {
      result = result.filter((p) =>
        (p.lineas_pedido ?? []).some((line: any) =>
          String(line.style ?? "")
            .toLowerCase()
            .includes(filters.style.toLowerCase())
        )
      );
    }

    if (filters.search) {
      result = result.filter(
        (p) =>
          test(p.po) ||
          test(p.po_number) ||
          test(p.customer) ||
          test(p.supplier) ||
          test(p.factory) ||
          test(p.season) ||
          test(p.estado) ||
          (p.lineas_pedido ?? []).some(
            (line: any) =>
              test(line.reference) ||
              test(line.style) ||
              test(line.color) ||
              test(line.category)
          )
      );
    }

    setFilteredPOs(result);
  }, [filters, pos]);

  if (loading) return <div className="p-10">Cargando...</div>;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lista de Purchase Orders</h1>

        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300"
          >
            ← Inicio
          </Link>

          <Link
            href="/po/nuevo/editar"
            className="rounded bg-black px-4 py-2 text-white transition hover:bg-gray-800"
          >
            + Nuevo PO
          </Link>
        </div>
      </div>

      <FiltersBox
        customers={customers}
        suppliers={suppliers}
        factories={factories}
        seasons={seasons}
        styles={styles}
        estados={estados}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      <POsTable pos={filteredPOs} />
    </div>
  );
}