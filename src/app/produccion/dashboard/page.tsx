"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import { PO } from "@/types";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Link from "next/link";

import DashboardCards from "@/components/dashboard/DashboardCards";
import ExportChina from "@/components/dashboard/ExportChina";
import ImportChina from "@/components/dashboard/ImportChina";
import POsTable from "@/components/dashboard/POsTable";
import AlertasDashboard from "@/components/alertas/AlertasDashboard";
import FiltersBox from "@/components/dashboard/FiltersBox";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

// -----------------------------------------------------
// Tipos y constantes
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

// Helper seguro
function getStylesFromPO(po: PO): string[] {
  const maybe = (po as any)?.styles;
  return Array.isArray(maybe) ? maybe.filter(Boolean) : [];
}

// -----------------------------------------------------
// Página principal
// -----------------------------------------------------

export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Alerts (solo estado, sin lógica vieja)
  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState("");

  // Import China
  const [chinaFile, setChinaFile] = useState<File | null>(null);
  const [importingChina, setImportingChina] = useState(false);
  const [importChinaMsg, setImportChinaMsg] = useState("");

  // -----------------------------------------------------
  // Cargar POs
  // -----------------------------------------------------
  useEffect(() => {
    const loadPOs = async () => {
      try {
        const data = await fetchPOs();
        setPOs(data);
        setFilteredPOs(data);
      } catch (error) {
        console.error("Error loading POs:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPOs();
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
    () => [...new Set(pos.map((p) => (p as any)?.season).filter(Boolean))].sort(),
    [pos]
  );

  const availableStyles = useMemo(() => {
    const all = pos.flatMap((po) => getStylesFromPO(po));
    return [...new Set(all)].sort();
  }, [pos]);

  // -----------------------------------------------------
  // Funciones refactorizadas para FiltersBox
  // -----------------------------------------------------

  const updateFilter = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // -----------------------------------------------------
  // Aplicar filtros
  // -----------------------------------------------------
  useEffect(() => {
    let result = pos;

    if (filters.customer !== "todos") result = result.filter((po) => po.customer === filters.customer);
    if (filters.supplier !== "todos") result = result.filter((po) => po.supplier === filters.supplier);
    if (filters.factory !== "todos") result = result.filter((po) => po.factory === filters.factory);
    if (filters.season !== "todos") result = result.filter((po) => (po as any)?.season === filters.season);

    if (filters.style !== "todos") {
      result = result.filter((po) => getStylesFromPO(po).includes(filters.style));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((po) => {
        const test = (s?: string) => (s || "").toLowerCase().includes(q);
        const styles = getStylesFromPO(po).join(" ").toLowerCase();

        return (
          test(po.po) ||
          test(po.customer) ||
          test(po.supplier) ||
          test(po.factory) ||
          test((po as any)?.season) ||
          styles.includes(q)
        );
      });
    }

    setFilteredPOs(result);
  }, [filters, pos]);

  // -----------------------------------------------------
  // Import China
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

      const resumen =
        `Importación completada:\n` +
        `• POs encontrados: ${json.pos_encontrados}\n` +
        `• Líneas actualizadas: ${json.lineas_actualizadas}\n` +
        `• Muestras actualizadas: ${json.muestras_actualizadas}\n` +
        `• Avisos: ${json.avisos.length}\n` +
        `• Errores: ${json.errores.length}\n`;

      setImportChinaMsg(resumen);
      return resumen;
    } finally {
      setImportingChina(false);
    }
  };

  // -----------------------------------------------------
  // Loader
  // -----------------------------------------------------
  if (loading) {
    return <div className="p-10">Cargando...</div>;
  }

  // -----------------------------------------------------
  // UI principal
  // -----------------------------------------------------
  return (
    <div className="container mx-auto py-6 space-y-6">

      {/* HEADER */}
      <DashboardHeader />

      {/* TABS */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>

          <TabsTrigger value="alertas">
            Alertas
            {alertasNoLeidasCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {alertasNoLeidasCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">

          <DashboardCards
            totalPOs={pos.length}
            totalCustomers={customers.length}
            totalSuppliers={suppliers.length}
            totalFactories={factories.length}
          />

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
            onChange={updateFilter}
            onClear={resetFilters}
          />

          <POsTable pos={filteredPOs} />
        </TabsContent>

        {/* TAB ALERTAS */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sistema de Alertas</h2>

            <Button
              onClick={async () => {
                setGenerandoAlertas(true);
                const res = await fetch("/api/generar-alertas", { method: "POST" });
                const data = await res.json();
                setMensajeAlertas(data.message || "Proceso finalizado.");
                setGenerandoAlertas(false);
              }}
              disabled={generandoAlertas}
            >
              {generandoAlertas ? "Generando..." : "Generar alertas"}
            </Button>
          </div>

          {mensajeAlertas && (
            <div className="p-3 rounded bg-gray-50 border">{mensajeAlertas}</div>
          )}

          <AlertasDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
