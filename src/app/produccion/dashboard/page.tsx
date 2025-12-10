"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import { PO } from "@/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCards from "@/components/dashboard/DashboardCards";
import ExportChina from "@/components/dashboard/ExportChina";
import ImportChina from "@/components/dashboard/ImportChina";
import FiltersBox from "@/components/dashboard/FiltersBox";
import POsTable from "@/components/dashboard/POsTable";
import AlertsBox from "@/components/dashboard/AlertsBox";

// Estados y gráficos
import { getEstadoPO } from "@/utils/getEstadoPO";
import { getEstadoPOPriority } from "@/utils/getEstadoPriority";
import { getDashboardEstados } from "@/utils/getDashboardEstados";
import POStatusChart from "@/components/dashboard/POStatusChart";

// -----------------------------------------------------
// Tipos
// -----------------------------------------------------
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

function getStylesFromPO(po: PO): string[] {
  const list = (po as any)?.styles;
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

// -----------------------------------------------------
// Página principal
// -----------------------------------------------------
export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTROS (tabla principal)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // FILTROS DEL GRÁFICO
  const [selectedSeason, setSelectedSeason] = useState("todas");
  const [selectedSupplier, setSelectedSupplier] = useState("todos");
  const [selectedFactory, setSelectedFactory] = useState("todos");
  const [selectedCustomer, setSelectedCustomer] = useState("todos");

  // Import China
  const [chinaFile, setChinaFile] = useState<File | null>(null);
  const [importingChina, setImportingChina] = useState(false);
  const [importChinaMsg, setImportChinaMsg] = useState("");

  // -----------------------------------------------------
  // Cargar POs
  // -----------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchPOs();
        setPOs(data);
        setFilteredPOs(data);
      } catch (err) {
        console.error("Error cargando POs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // -----------------------------------------------------
  // Listas base para filtros
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
    () =>
      [...new Set(pos.map((p) => (p as any)?.season).filter(Boolean))].sort(),
    [pos]
  );

  const availableStyles = useMemo(() => {
    const styles = pos.flatMap((po) => getStylesFromPO(po));
    return [...new Set(styles)].sort();
  }, [pos]);

  // -----------------------------------------------------
  // Aplicar filtros a la TABLA + ordenar por estado
  // -----------------------------------------------------
  useEffect(() => {
    let result = pos;

    if (filters.customer !== "todos")
      result = result.filter((p) => p.customer === filters.customer);

    if (filters.supplier !== "todos")
      result = result.filter((p) => p.supplier === filters.supplier);

    if (filters.factory !== "todos")
      result = result.filter((p) => p.factory === filters.factory);

    if (filters.season !== "todos")
      result = result.filter((p) => (p as any)?.season === filters.season);

    if (filters.style !== "todos") {
      result = result.filter((p) => getStylesFromPO(p).includes(filters.style));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((p) => {
        const test = (s?: string) => (s || "").toLowerCase().includes(q);
        const styles = getStylesFromPO(p).join(" ").toLowerCase();

        return (
          test(p.po) ||
          test(p.customer) ||
          test(p.supplier) ||
          test(p.factory) ||
          test((p as any)?.season) ||
          styles.includes(q)
        );
      });
    }

    const sorted = [...result].sort((a, b) => {
      const eA = getEstadoPO(a);
      const eB = getEstadoPO(b);
      return getEstadoPOPriority(eA.estado) - getEstadoPOPriority(eB.estado);
    });

    setFilteredPOs(sorted);
  }, [filters, pos]);

  // -----------------------------------------------------
  // Import China (UNIFICADO con /import/china)
  // -----------------------------------------------------
  const handleChinaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChinaFile(e.target.files?.[0] || null);
    setImportChinaMsg("");
  };

  const handleImportChina = async (): Promise<string> => {
    if (!chinaFile) {
      alert("Selecciona un archivo .xlsx primero.");
      return "";
    }

    setImportingChina(true);
    setImportChinaMsg("");

    try {
      const formData = new FormData();
      formData.append("file", chinaFile);

      const res = await fetch("/api/import-china", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        const msg = json.error || "Error al importar.";
        setImportChinaMsg(msg);
        return msg;
      }

      // Resumen corto para ver directamente en la tarjeta
      const resumenCorto =
        `Importación completada:\n` +
        `• POs encontrados: ${json.pos_encontrados}\n` +
        `• Líneas actualizadas: ${json.lineas_actualizadas}\n` +
        `• Muestras actualizadas: ${json.muestras_actualizadas}\n` +
        `• Avisos: ${json.avisos.length}\n` +
        `• Errores: ${json.errores.length}\n`;

      setImportChinaMsg(resumenCorto);

      // Informe completo (el que se muestra en el modal + TXT)
      const cambios: string[] = json.detalles?.cambios || [];
      const avisos: string[] = json.avisos || [];
      const errores: string[] = json.errores || [];

      const reportLines: string[] = [
        "===== INFORME IMPORTACIÓN CHINA =====",
        "",
        `POs encontrados: ${json.pos_encontrados}`,
        `Líneas actualizadas: ${json.lineas_actualizadas}`,
        `Muestras actualizadas: ${json.muestras_actualizadas}`,
        `Avisos: ${avisos.length}`,
        `Errores: ${errores.length}`,
        "",
        "=== CAMBIOS ===",
        ...(cambios.length > 0
          ? cambios.map((c) => `• ${c}`)
          : ["(Sin cambios registrados)"]),
        "",
        "=== AVISOS ===",
        ...(avisos.length > 0
          ? avisos.map((a) => `• ${a}`)
          : ["(Sin avisos)"]),
        "",
        "=== ERRORES ===",
        ...(errores.length > 0
          ? errores.map((e) => `• ${e}`)
          : ["(Sin errores)"]),
      ];

      const report = reportLines.join("\n");
      return report; // 🔥 esto lo recibe el componente ImportChina y abre el modal
    } finally {
      setImportingChina(false);
    }
  };

  // -----------------------------------------------------
  // FILTRO DEL GRÁFICO
  // -----------------------------------------------------
  const posForChart = pos
    .filter(
      (p) => selectedSeason === "todas" || (p as any)?.season === selectedSeason
    )
    .filter(
      (p) => selectedSupplier === "todos" || p.supplier === selectedSupplier
    )
    .filter(
      (p) => selectedFactory === "todos" || p.factory === selectedFactory
    )
    .filter(
      (p) => selectedCustomer === "todos" || p.customer === selectedCustomer
    );

  const chartData = getDashboardEstados(posForChart);

  // -----------------------------------------------------
  // Loader
  // -----------------------------------------------------
  if (loading) {
    return <div className="p-10">Cargando...</div>;
  }

  // -----------------------------------------------------
  // Render principal
  // -----------------------------------------------------
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* HEADER */}
      <DashboardHeader />

      {/* TABS */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        {/* --- TAB: DASHBOARD --- */}
        <TabsContent value="dashboard" className="space-y-6">
          <DashboardCards
            totalPOs={pos.length}
            totalCustomers={customers.length}
            totalSuppliers={suppliers.length}
            totalFactories={factories.length}
          />

          {/* FILTROS DEL GRÁFICO */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold">Estado general de los POs</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Season */}
              <div>
                <label className="text-sm font-medium">Season:</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full border px-3 py-1 rounded"
                >
                  <option value="todas">Todas</option>
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="text-sm font-medium">Supplier:</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full border px-3 py-1 rounded"
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
                <label className="text-sm font-medium">Factory:</label>
                <select
                  value={selectedFactory}
                  onChange={(e) => setSelectedFactory(e.target.value)}
                  className="w-full border px-3 py-1 rounded"
                >
                  <option value="todos">Todas</option>
                  {factories.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer */}
              <div>
                <label className="text-sm font-medium">Customer:</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border px-3 py-1 rounded"
                >
                  <option value="todos">Todos</option>
                  {customers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <POStatusChart data={chartData} />
            </div>
          </div>

          {/* IMPORT / EXPORT / FILTERS */}
          <ExportChina seasons={seasons} />

          <ImportChina
            chinaFile={chinaFile}
            importingChina={importingChina}
            importChinaMsg={importChinaMsg}
            handleChinaFileChange={handleChinaFileChange}
            handleImportChina={handleImportChina}
          />

          <FiltersBox
            customers={customers}
            suppliers={suppliers}
            factories={factories}
            seasons={seasons}
            styles={availableStyles}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(DEFAULT_FILTERS)}
          />

          <POsTable pos={filteredPOs} />
        </TabsContent>

        {/* --- TAB: ALERTAS --- */}
        <TabsContent value="alertas" className="space-y-4">
          <AlertsBox />
        </TabsContent>
      </Tabs>
    </div>
  );
}
