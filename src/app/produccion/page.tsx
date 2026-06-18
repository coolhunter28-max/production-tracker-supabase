"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type Muestra = {
  id: string;
  tipo_muestra: string | null;
  round: string | null;
  estado_muestra: string | null;
  fecha_teorica: string | null;
  fecha_muestra: string | null;
};

type LineaPedido = {
  id: string;
  reference: string | null;
  style: string | null;
  color: string | null;
  size_run: string | null;
  category: string | null;
  qty: number | null;
  price: number | null;
  amount: number | null;
  pi_number: string | null;
  etd: string | null;
  pi_bsg: string | null;
  price_selling: number | null;
  amount_selling: number | null;
  muestras?: Muestra[];
};

type PO = {
  id: string;
  po: string | null;
  customer: string | null;
  supplier: string | null;
  factory: string | null;
  season: string | null;
  po_date: string | null;
  etd_pi: string | null;
  pi: string | null;
  channel: string | null;
  booking: string | null;
  closing: string | null;
  shipping_date: string | null;
  currency: string | null;
  estado?: string;
  lineas_pedido?: LineaPedido[];
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

const SAMPLE_ORDER = ["CFMS", "COUNTERS", "FITTINGS", "PPS", "TESTINGS", "SHIPPINGS"];

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

function formatMoney(value?: number | null, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function getQtyTotal(po: PO): number {
  return (po.lineas_pedido ?? []).reduce((sum, line) => sum + Number(line.qty ?? 0), 0);
}

function getPiSummary(po: PO): string {
  const pis = [
    ...new Set((po.lineas_pedido ?? []).map((line) => text(line.pi_number)).filter(Boolean)),
  ];

  if (pis.length === 0) return po.pi || "-";
  if (pis.length <= 3) return pis.join(" / ");
  return `${pis.length} PI: ${pis.slice(0, 2).join(" / ")}...`;
}

function getNextEtd(po: PO): string {
  const dates = [
    ...new Set((po.lineas_pedido ?? []).map((line) => text(line.etd)).filter(Boolean)),
  ].sort();

  if (dates.length === 0) return po.etd_pi ? formatDate(po.etd_pi) : "-";
  if (dates.length === 1) return formatDate(dates[0]);
  return `Próxima ${formatDate(dates[0])} (+${dates.length - 1})`;
}

function normalizeSampleType(type?: string | null): string {
  if (!type) return "-";
  if (type.toLowerCase() === "development") return "CFMS";
  return type;
}

function getSampleStatus(line: LineaPedido): string {
  const samples = [...(line.muestras ?? [])].sort((a, b) => {
    const aIndex = SAMPLE_ORDER.indexOf(normalizeSampleType(a.tipo_muestra));
    const bIndex = SAMPLE_ORDER.indexOf(normalizeSampleType(b.tipo_muestra));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  const active = samples.filter(
    (sample) => sample.round !== "N/N" && sample.estado_muestra !== "N/N"
  );

  if (active.length === 0) return "N/N";

  const rejected = active.find((sample) =>
    text(sample.estado_muestra).toLowerCase().includes("rechaz")
  );
  if (rejected) return `${normalizeSampleType(rejected.tipo_muestra)} rechazado`;

  const pending = active.find((sample) =>
    text(sample.estado_muestra).toLowerCase().includes("pend")
  );
  if (pending) return `${normalizeSampleType(pending.tipo_muestra)} ${pending.round ?? ""}`.trim();

  return `${active.length} muestras`;
}

function matchesSearch(po: PO, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;

  const includes = (value?: string | number | null) =>
    String(value ?? "").toLowerCase().includes(q);

  return (
    includes(po.po) ||
    includes(po.customer) ||
    includes(po.supplier) ||
    includes(po.factory) ||
    includes(po.season) ||
    includes(po.estado) ||
    (po.lineas_pedido ?? []).some(
      (line) =>
        includes(line.style) ||
        includes(line.reference) ||
        includes(line.color) ||
        includes(line.category) ||
        includes(line.pi_number)
    )
  );
}

function ExpandedLines({ po }: { po: PO }) {
  const lines = po.lineas_pedido ?? [];

  if (lines.length === 0) {
    return (
      <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        Este PO no tiene líneas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">Style</th>
            <th className="px-3 py-2 text-left">Reference</th>
            <th className="px-3 py-2 text-left">Color</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-left">PI línea</th>
            <th className="px-3 py-2 text-left">ETD línea</th>
            <th className="px-3 py-2 text-left">Muestras</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t">
              <td className="px-3 py-2 font-medium">{line.style || "-"}</td>
              <td className="px-3 py-2">{line.reference || "-"}</td>
              <td className="px-3 py-2">{line.color || "-"}</td>
              <td className="px-3 py-2 text-right">{line.qty ?? "-"}</td>
              <td className="px-3 py-2">{line.pi_number || "-"}</td>
              <td className="px-3 py-2">{formatDate(line.etd)}</td>
              <td className="px-3 py-2">{getSampleStatus(line)}</td>
              <td className="px-3 py-2 text-right">{formatMoney(line.amount, po.currency ?? "USD")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function POsPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchPOs();

      const enriched: PO[] = data.map((po: any) => {
        const estadoInfo = getEstadoPO(po as PO);
      
        return {
          ...po,
          currency: po.currency ?? null,
          estado: estadoInfo.estado ?? po.estado ?? "Sin datos",
        } as PO;
      });

      setPOs(enriched);
      setFilteredPOs(enriched);
      setLoading(false);
    };

    load();
  }, []);

  const customers = useMemo(
    () => [...new Set(pos.map((p) => p.customer).filter(Boolean) as string[])].sort(),
    [pos]
  );

  const suppliers = useMemo(
    () => [...new Set(pos.map((p) => p.supplier).filter(Boolean) as string[])].sort(),
    [pos]
  );

  const factories = useMemo(
    () => [...new Set(pos.map((p) => p.factory).filter(Boolean) as string[])].sort(),
    [pos]
  );

  const seasons = useMemo(
    () => [...new Set(pos.map((p) => p.season).filter(Boolean) as string[])].sort(),
    [pos]
  );

  const styles = useMemo(
    () =>
      [
        ...new Set(
          pos
            .flatMap((p) => p.lineas_pedido ?? [])
            .map((line) => line.style)
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [pos]
  );

  const estados = useMemo(
    () => [...new Set(pos.map((p) => p.estado).filter(Boolean) as string[])].sort(),
    [pos]
  );

  useEffect(() => {
    let result = [...pos];

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
      const styleQuery = filters.style.toLowerCase();
      result = result.filter((p) =>
        (p.lineas_pedido ?? []).some((line) =>
          String(line.style ?? "").toLowerCase().includes(styleQuery)
        )
      );
    }

    if (filters.search) {
      result = result.filter((p) => matchesSearch(p, filters.search));
    }

    setFilteredPOs(result);
  }, [filters, pos]);

  async function handleDelete(po: PO) {
    const label = po.po || po.id;
    const confirmed = window.confirm(`¿Eliminar el PO ${label}? Esta acción eliminará también sus líneas y muestras.`);
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
      console.error(error);
      alert("No se pudo eliminar el PO.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className="p-10">Cargando...</div>;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lista de Purchase Orders</h1>
          <p className="text-sm text-slate-500">
            Vista operativa con líneas desplegables y búsqueda por style, referencia y color.
          </p>
        </div>

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

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">POs</h2>
            <p className="text-xs text-slate-500">
              {filteredPOs.length} resultado{filteredPOs.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">PO</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Factory</th>
                <th className="px-4 py-3 text-right">Líneas</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">PI</th>
                <th className="px-4 py-3 text-left">ETD</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    No hay POs con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const isExpanded = Boolean(expanded[po.id]);
                  const lineCount = po.lineas_pedido?.length ?? 0;

                  return (
                    <tr key={po.id} className="border-t align-top">
                      <td colSpan={11} className="p-0">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
                          <div className="grid grid-cols-10 gap-3 text-sm">
                            <div>
                              <Link href={`/po/${po.id}`} className="font-semibold text-blue-700 hover:underline">
                                {po.po || "-"}
                              </Link>
                              <div className="text-xs text-slate-500">{formatDate(po.po_date)}</div>
                            </div>
                            <div>{po.customer || "-"}</div>
                            <div>{po.season || "-"}</div>
                            <div>{po.supplier || "-"}</div>
                            <div>{po.factory || "-"}</div>
                            <div className="text-right">{lineCount}</div>
                            <div className="text-right">{getQtyTotal(po)}</div>
                            <div>{getPiSummary(po)}</div>
                            <div>{getNextEtd(po)}</div>
                            <div>{po.estado || "Sin datos"}</div>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((current) => ({
                                  ...current,
                                  [po.id]: !current[po.id],
                                }))
                              }
                              className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                            >
                              {isExpanded ? "Ocultar" : "Mostrar"}
                            </button>

                            <Link
                              href={`/po/${po.id}`}
                              className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                            >
                              Ver
                            </Link>

                            <Link
                              href={`/po/${po.id}/editar`}
                              className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                            >
                              Editar
                            </Link>

                            <button
                              type="button"
                              disabled={deletingId === po.id}
                              onClick={() => handleDelete(po)}
                              className="rounded bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId === po.id ? "Eliminando" : "Eliminar"}
                            </button>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="border-t bg-slate-50 px-4 py-4">
                            <ExpandedLines po={po} />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
