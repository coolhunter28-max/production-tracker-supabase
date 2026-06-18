"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import FiltersBox from "@/components/dashboard/FiltersBox";
import { fetchPOs } from "@/services/pos";
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

type Sample = {
  id?: string;
  tipo_muestra?: string | null;
  round?: string | null;
  estado_muestra?: string | null;
  fecha_teorica?: string | null;
  fecha_muestra?: string | null;
};

type POLine = {
  id?: string;
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  qty?: number | null;
  pi_number?: string | null;
  etd?: string | null;
  muestras?: Sample[] | null;
};

type POListItem = {
  id: string;
  po?: string | null;
  po_number?: string | null;
  customer?: string | null;
  supplier?: string | null;
  factory?: string | null;
  season?: string | null;
  po_date?: string | null;
  etd_pi?: string | null;
  pi?: string | null;
  currency?: string | null;
  estado?: string | null;
  lineas_pedido?: POLine[] | null;
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

const SAMPLE_ORDER = [
  "CFMS",
  "COUNTERS",
  "FITTINGS",
  "PPS",
  "TESTINGS",
  "SHIPPINGS",
];

function display(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  return value;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b)
  );
}

function getLines(po: POListItem) {
  return po.lineas_pedido ?? [];
}

function getQtyTotal(po: POListItem) {
  return getLines(po).reduce((sum, line) => sum + Number(line.qty ?? 0), 0);
}

function getNextETD(po: POListItem) {
  const etds = uniqueValues(getLines(po).map((line) => line.etd));

  if (etds.length === 0) return display(po.etd_pi);
  if (etds.length === 1) return etds[0];

  return `${etds[0]} (+${etds.length - 1})`;
}

function getSampleSummary(line: POLine) {
  const samples = [...(line.muestras ?? [])].sort((a, b) => {
    const aIndex = SAMPLE_ORDER.indexOf(String(a.tipo_muestra ?? ""));
    const bIndex = SAMPLE_ORDER.indexOf(String(b.tipo_muestra ?? ""));

    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  const active = samples.filter(
    (sample) =>
      String(sample.round ?? "").toUpperCase() !== "N/N" &&
      String(sample.estado_muestra ?? "").toUpperCase() !== "N/N"
  );

  if (active.length === 0) return "N/N";

  return active
    .map((sample) => {
      const type = sample.tipo_muestra ?? "Muestra";
      const round = sample.round ?? "";
      const estado = sample.estado_muestra ?? "";

      return [type, round, estado].filter(Boolean).join(" · ");
    })
    .join(" / ");
}

function lineMatchesSearch(line: POLine, search: string) {
  const needle = search.toLowerCase();

  return [line.reference, line.style, line.color, line.pi_number, line.etd]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(needle));
}

function estadoBadgeClass(estado?: string | null) {
  const normalized = String(estado ?? "").toLowerCase();

  if (normalized.includes("finalizado")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized.includes("producción") || normalized.includes("produccion")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized.includes("sin datos")) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (normalized.includes("retras")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function EstadoBadge({ estado }: { estado?: string | null }) {
  return (
    <span
      className={[
        "inline-flex min-w-[88px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        estadoBadgeClass(estado),
      ].join(" ")}
    >
      {display(estado)}
    </span>
  );
}

export default function POsPage() {
  const [pos, setPOs] = useState<POListItem[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<POListItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPOs();

        const enriched: POListItem[] = data.map((po: any) => {
          const estadoInfo = getEstadoPO(po);

          return {
            ...po,
            currency: po.currency ?? null,
            lineas_pedido: po.lineas_pedido ?? [],
            estado: estadoInfo.estado ?? po.estado ?? "Sin datos",
          };
        });

        setPOs(enriched);
        setFilteredPOs(enriched);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const customers = useMemo(
    () => uniqueValues(pos.map((p) => p.customer)),
    [pos]
  );

  const suppliers = useMemo(
    () => uniqueValues(pos.map((p) => p.supplier)),
    [pos]
  );

  const factories = useMemo(
    () => uniqueValues(pos.map((p) => p.factory)),
    [pos]
  );

  const seasons = useMemo(
    () => uniqueValues(pos.map((p) => p.season)),
    [pos]
  );

  const styles = useMemo(
    () => uniqueValues(pos.flatMap((p) => getLines(p).map((line) => line.style))),
    [pos]
  );

  const estados = useMemo(
    () => uniqueValues(pos.map((p) => p.estado)),
    [pos]
  );

  useEffect(() => {
    let result = pos;

    const test = (val?: string | number | null) =>
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
        getLines(p).some((line) =>
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
          getLines(p).some((line) => lineMatchesSearch(line, filters.search))
      );
    }

    setFilteredPOs(result);
  }, [filters, pos]);

  const toggleExpanded = (id: string) => {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const handleDelete = async (po: POListItem) => {
    const label = po.po ?? po.po_number ?? po.id;
    const confirmed = window.confirm(
      `¿Eliminar PO ${label}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingId(po.id);

    try {
      const response = await fetch(`/api/po/${po.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar el PO.");
      }

      setPOs((current) => current.filter((item) => item.id !== po.id));
      setFilteredPOs((current) => current.filter((item) => item.id !== po.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error eliminando PO.");
    } finally {
      setDeletingId(null);
    }
  };

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

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Lista de Purchase Orders</h2>
            <p className="text-sm text-slate-500">
              {filteredPOs.length} PO visibles. Despliega una PO para revisar
              sus líneas.
            </p>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto rounded border">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="w-[80px] px-2 py-2">Detalle</th>
                <th className="w-[90px] px-2 py-2">PO</th>
                <th className="w-[120px] px-2 py-2">Supplier</th>
                <th className="w-[135px] px-2 py-2">Customer</th>
                <th className="w-[80px] px-2 py-2">Factory</th>
                <th className="w-[80px] px-2 py-2">Season</th>
                <th className="w-[95px] px-2 py-2">PO Date</th>
                <th className="w-[95px] px-2 py-2">ETD</th>
                <th className="w-[55px] px-2 py-2 text-center">Líneas</th>
                <th className="w-[70px] px-2 py-2 text-right">Qty</th>
                <th className="w-[100px] px-2 py-2">Estado</th>
                <th className="w-[170px] px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredPOs.map((po) => {
                const lines = getLines(po);
                const isExpanded = Boolean(expanded[po.id]);

                return (
                  <Fragment key={po.id}>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="w-[80px] px-2 py-2">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(po.id)}
                          className="inline-flex w-[66px] items-center justify-center rounded border px-2 py-1 text-xs font-medium hover:bg-slate-100"
                        >
                          {isExpanded ? "Ocultar" : "Mostrar"}
                        </button>
                      </td>

                      <td className="w-[90px] truncate px-2 py-2 font-medium">
                        {display(po.po ?? po.po_number)}
                      </td>

                      <td className="w-[120px] truncate px-2 py-2">
                        {display(po.supplier)}
                      </td>

                      <td className="w-[135px] truncate px-2 py-2">
                        {display(po.customer)}
                      </td>

                      <td className="w-[80px] truncate px-2 py-2">
                        {display(po.factory)}
                      </td>

                      <td className="w-[80px] truncate px-2 py-2">
                        {display(po.season)}
                      </td>

                      <td className="w-[95px] truncate px-2 py-2">
                        {shortDate(po.po_date)}
                      </td>

                      <td className="w-[95px] truncate px-2 py-2">
                        {getNextETD(po)}
                      </td>

                      <td className="w-[55px] px-2 py-2 text-center">
                        {lines.length}
                      </td>

                      <td className="w-[70px] px-2 py-2 text-right">
                        {getQtyTotal(po).toLocaleString("es-ES")}
                      </td>

                      <td className="w-[100px] px-2 py-2">
                        <EstadoBadge estado={po.estado} />
                      </td>

                      <td className="w-[170px] px-2 py-2">
                        <div className="flex justify-end gap-1 whitespace-nowrap">
                          <Link
                            href={`/po/${po.id}`}
                            className="rounded border px-2.5 py-1 text-xs hover:bg-slate-100"
                          >
                            Ver
                          </Link>

                          <Link
                            href={`/po/${po.id}/editar`}
                            className="rounded border px-2.5 py-1 text-xs hover:bg-slate-100"
                          >
                            Editar
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(po)}
                            disabled={deletingId === po.id}
                            className="rounded bg-red-500 px-2.5 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === po.id ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b bg-slate-50/60">
                        <td colSpan={12} className="px-3 py-3">
                          {lines.length === 0 ? (
                            <div className="rounded border border-dashed bg-white p-4 text-sm text-slate-500">
                              Este PO no tiene líneas.
                            </div>
                          ) : (
                            <div className="max-w-full overflow-x-auto rounded border bg-white">
                              <table className="min-w-[900px] text-xs">
                                <thead>
                                  <tr className="border-b bg-slate-100 text-left uppercase text-slate-500">
                                    <th className="px-3 py-2">Style</th>
                                    <th className="px-3 py-2">Reference</th>
                                    <th className="px-3 py-2">Color</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                    <th className="px-3 py-2">PI línea</th>
                                    <th className="px-3 py-2">ETD línea</th>
                                    <th className="px-3 py-2">Muestras</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {lines.map((line, index) => (
                                    <tr
                                      key={line.id ?? `${po.id}-${index}`}
                                      className="border-b last:border-b-0"
                                    >
                                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                                        {display(line.style)}
                                      </td>

                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {display(line.reference)}
                                      </td>

                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {display(line.color)}
                                      </td>

                                      <td className="px-3 py-2 text-right">
                                        {Number(line.qty ?? 0).toLocaleString(
                                          "es-ES"
                                        )}
                                      </td>

                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {display(line.pi_number)}
                                      </td>

                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {display(line.etd)}
                                      </td>

                                      <td className="px-3 py-2">
                                        {getSampleSummary(line)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    No hay POs que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
