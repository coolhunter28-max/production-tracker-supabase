"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchPOs } from "@/services/pos";
import { PO } from "@/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import Link from "next/link";
import AlertasDashboard from "@/components/alertas/AlertasDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DashboardCards from "@/components/dashboard/DashboardCards";
import ExportChina from "@/components/dashboard/ExportChina";
import ImportChina from "@/components/dashboard/ImportChina";


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
// Componente principal
// -----------------------------------------------------

export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState("");

  // Export China
  const [exportSeasons, setExportSeasons] = useState<string[]>([]);

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
  // Cargar contador de alertas no leídas
  // -----------------------------------------------------
  useEffect(() => {
    const cargarContadorAlertas = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.success) {
          setAlertasNoLeidasCount(data.alertas.length);
        } else if (Array.isArray(data)) {
          setAlertasNoLeidasCount(data.filter((a: any) => !a.leida).length);
        }
      } catch (error) {
        console.error("Error cargando contador de alertas:", error);
      }
    };
    cargarContadorAlertas();
  }, []);

  // -----------------------------------------------------
  // Listas base
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

  // Inicializar exportSeasons con todas las seasons
  useEffect(() => {
    if (seasons.length > 0 && exportSeasons.length === 0) {
      setExportSeasons(seasons);
    }
  }, [seasons, exportSeasons.length]);

  // -----------------------------------------------------
  // Pre-filtro (para calcular styles disponibles)
  // -----------------------------------------------------
  const preStyleFiltered = useMemo(() => {
    return pos.filter((po) => {
      if (filters.customer !== "todos" && po.customer !== filters.customer)
        return false;
      if (filters.supplier !== "todos" && po.supplier !== filters.supplier)
        return false;
      if (filters.factory !== "todos" && po.factory !== filters.factory)
        return false;
      if (filters.season !== "todos" && (po as any)?.season !== filters.season)
        return false;
      return true;
    });
  }, [pos, filters.customer, filters.supplier, filters.factory, filters.season]);

  const availableStyles = useMemo(() => {
    const all = preStyleFiltered.flatMap((po) => getStylesFromPO(po));
    return [...new Set(all)].sort();
  }, [preStyleFiltered]);

  // Reset style si ya no existe
  useEffect(() => {
    if (filters.style !== "todos" && !availableStyles.includes(filters.style)) {
      setFilters((prev) => ({ ...prev, style: "todos" }));
    }
  }, [availableStyles, filters.style]);

  // -----------------------------------------------------
  // Filtro final
  // -----------------------------------------------------
  useEffect(() => {
    let result = preStyleFiltered;

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
  }, [preStyleFiltered, filters.style, filters.search]);

  // -----------------------------------------------------
  // Generar alertas
  // -----------------------------------------------------
  const handleGenerarAlertas = async () => {
    setGenerandoAlertas(true);
    setMensajeAlertas("");
    try {
      const res = await fetch("/api/generar-alertas", { method: "POST" });
      const data = await res.json();

      if (data?.success) {
        setMensajeAlertas(data.message || "Alertas generadas.");
        const noLeidas = (data.alertas || []).filter((a: any) => !a.leida);
        setAlertasNoLeidasCount(noLeidas.length);
      } else {
        setMensajeAlertas(data?.message || "Error al generar alertas");
      }
    } catch (error) {
      console.error("Error al generar alertas:", error);
      setMensajeAlertas("Error de red al generar alertas.");
    } finally {
      setGenerandoAlertas(false);
    }
  };

  // -----------------------------------------------------
  // Export China
  // -----------------------------------------------------
  const toggleExportSeason = (season: string) => {
    setExportSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season]
    );
  };

  const handleExportChina = () => {
    if (exportSeasons.length === 0) {
      alert("Selecciona al menos una temporada para exportar.");
      return;
    }
    const qs = exportSeasons.join(",");
    window.location.href = `/api/export-china?seasons=${encodeURIComponent(qs)}`;
  };

 // -----------------------------------------------------
// Import China
// -----------------------------------------------------

// 1) Cambio de archivo
const handleChinaFileChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setChinaFile(e.target.files?.[0] || null);
  setImportChinaMsg("");
};

// 2) Helper para construir el reporte completo
function buildReport(json: any) {
  let report = "";

  report += "=== RESUMEN GENERAL ===\n";
  report += `• POs encontrados: ${json.pos_encontrados}\n`;
  report += `• Líneas actualizadas: ${json.lineas_actualizadas}\n`;
  report += `• Muestras actualizadas: ${json.muestras_actualizadas}\n`;
  report += `• Avisos: ${json.avisos.length}\n`;
  report += `• Errores: ${json.errores.length}\n\n`;

  // ERRORES
  report += "=== ERRORES ===\n";
  if (!json.errores || json.errores.length === 0) {
    report += "No se encontraron errores.\n\n";
  } else {
    json.errores.forEach((err: any, i: number) => {
      report += `(${i + 1}) ${err}\n`;
    });
    report += "\n";
  }

  // AVISOS
  report += "=== AVISOS ===\n";
  if (!json.avisos || json.avisos.length === 0) {
    report += "No hay avisos.\n\n";
  } else {
    json.avisos.forEach((av: any, i: number) => {
      report += `(${i + 1}) ${av}\n`;
    });
    report += "\n";
  }

  // CAMBIOS
  report += "=== CAMBIOS DETECTADOS ===\n";
  if (!json.detalles?.cambios || json.detalles.cambios.length === 0) {
    report += "No se detectaron cambios.\n";
  } else {
    json.detalles.cambios.forEach((cambio: any, i: number) => {
      report += `(${i + 1}) ${cambio}\n`;
    });
  }

  return report;
}

// 3) Función principal de importación
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
      const msg = json.error || "Error al importar el archivo de China.";
      setImportChinaMsg(msg);
      return msg;
    }

    // 🧠 Construimos un reporte super completo
    const fullReport = buildReport(json);

    // En pantalla mostramos sólo el resumen
    const resumen =
      `Importación completada:\n` +
      `• POs encontrados: ${json.pos_encontrados}\n` +
      `• Líneas actualizadas: ${json.lineas_actualizadas}\n` +
      `• Muestras actualizadas: ${json.muestras_actualizadas}\n` +
      `• Avisos: ${json.avisos.length}\n` +
      `• Errores: ${json.errores.length}\n`;

    setImportChinaMsg(resumen);

    return fullReport; // <-- el popup utiliza esto
  } catch (err) {
    console.error("Error importando archivo China:", err);
    const msg = "Error de red al importar el archivo.";
    setImportChinaMsg(msg);
    return msg;
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
  // Render principal
  // -----------------------------------------------------
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Producción</h1>

        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">Inicio</Button>
          </Link>
          <Link href="/po/nuevo/editar">
            <Button>Nuevo PO</Button>
          </Link>
          <Link href="/produccion/import">
            <Button variant="outline">Importador CSV</Button>
          </Link>
        </div>
      </div>

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

        {/* TAB: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Tarjetas resumen */}
          <DashboardCards
            totalPOs={pos.length}
            totalCustomers={customers.length}
            totalSuppliers={suppliers.length}
            totalFactories={factories.length}
          />

{/* EXPORT CHINA */}
<ExportChina seasons={seasons} />

   <ImportChina
  chinaFile={chinaFile}
  importingChina={importingChina}
  importChinaMsg={importChinaMsg}
  handleChinaFileChange={handleChinaFileChange}
  handleImportChina={handleImportChina}
/>

          {/* FILTROS */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* CUSTOMER */}
                <div>
                  <label className="text-sm">Customer</label>
                  <Select
                    value={filters.customer}
                    onValueChange={(v) =>
                      setFilters({ ...filters, customer: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SUPPLIER */}
                <div>
                  <label className="text-sm">Supplier</label>
                  <Select
                    value={filters.supplier}
                    onValueChange={(v) =>
                      setFilters({ ...filters, supplier: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* FACTORY */}
                <div>
                  <label className="text-sm">Factory</label>
                  <Select
                    value={filters.factory}
                    onValueChange={(v) =>
                      setFilters({ ...filters, factory: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {factories.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SEASON */}
                <div>
                  <label className="text-sm">Season</label>
                  <Select
                    value={filters.season}
                    onValueChange={(v) =>
                      setFilters({ ...filters, season: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {seasons.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* STYLE */}
                <div>
                  <label className="text-sm">Style</label>
                  <Select
                    value={filters.style}
                    onValueChange={(v) =>
                      setFilters({ ...filters, style: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {availableStyles.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SEARCH */}
                <div>
                  <label className="text-sm">Buscar</label>
                  <Input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    placeholder="PO / Supplier / Customer..."
                  />
                </div>
              </div>

              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TABLA POs */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Purchase Orders</CardTitle>
              <CardDescription>
                Todos los pedidos registrados en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Factory</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>PO Date</TableHead>
                      <TableHead>ETD PI</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.length > 0 ? (
                      filteredPOs.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">
                            {po.po}
                          </TableCell>
                          <TableCell>{po.supplier}</TableCell>
                          <TableCell>{po.customer}</TableCell>
                          <TableCell>{po.factory}</TableCell>
                          <TableCell>{(po as any)?.season || "-"}</TableCell>
                          <TableCell>{po.po_date || "-"}</TableCell>
                          <TableCell>{po.etd_pi || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Link href={`/po/${po.id}/editar`}>
                                <Button size="sm" variant="outline">
                                  Editar
                                </Button>
                              </Link>
                              <Link href={`/po/${po.id}`}>
                                <Button size="sm" variant="ghost">
                                  Ver
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-4"
                        >
                          No hay resultados con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ALERTAS */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sistema de Alertas</h2>
            <Button
              onClick={handleGenerarAlertas}
              disabled={generandoAlertas}
              variant="outline"
            >
              {generandoAlertas ? "Generando..." : "Generar alertas"}
            </Button>
          </div>

          {mensajeAlertas && (
            <div
              className={`p-3 rounded-md ${
                mensajeAlertas.includes("Error")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {mensajeAlertas}
            </div>
          )}

          <AlertasDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
