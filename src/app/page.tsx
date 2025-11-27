'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchPOs } from '@/services/pos';
import { PO } from '@/types';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import AlertasDashboard from '@/components/alertas/AlertasDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  customer: 'todos',
  supplier: 'todos',
  factory: 'todos',
  season: 'todos',
  style: 'todos',
  search: '',
};

// Helper para sacar styles de un PO con fallback seguro
function getStylesFromPO(po: PO): string[] {
  const maybe = (po as any)?.styles;
  return Array.isArray(maybe) ? maybe.filter(Boolean) : [];
}

// === MODAL PARA MOSTRAR REPORTES DE CAMBIOS ===
function ReportModal({
  open,
  onClose,
  content,
}: {
  open: boolean;
  onClose: () => void;
  content: string;
}) {
  if (!open) return null;

  // 🔹 Generar archivo .txt y descargarlo
  const descargarTXT = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    // Nombre dinámico con fecha
    const fecha = new Date().toISOString().split("T")[0];
    a.download = `cambios_importacion_${fecha}.txt`;

    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold">Cambios detectados</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {content}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          
          {/* 🔹 BOTÓN DESCARGAR TXT */}
          <button
            onClick={descargarTXT}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Descargar TXT
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-900"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState('');

  // Temporadas exportación China
  const [exportSeasons, setExportSeasons] = useState<string[]>([]);

  // Importación desde China
  const [chinaFile, setChinaFile] = useState<File | null>(null);
  const [importingChina, setImportingChina] = useState(false);
  const [importChinaMsg, setImportChinaMsg] = useState<string>('');

  // === ESTADOS DEL MODAL ===
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState("");

  /* ============================================================
     CARGA INICIAL DE POs
     ============================================================ */
  useEffect(() => {
    const loadPOs = async () => {
      try {
        const data = await fetchPOs();
        setPOs(data);
        setFilteredPOs(data);
      } catch (error) {
        console.error('Error loading POs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPOs();
  }, []);

  /* ============================================================
     CONTADOR ALERTAS
     ============================================================ */
  useEffect(() => {
    const cargarContadorAlertas = async () => {
      try {
        const res = await fetch('/api/alertas?leida=false', { cache: 'no-store' });
        const data = await res.json();
        if (data?.success) {
          setAlertasNoLeidasCount(data.alertas.length);
        } else if (Array.isArray(data)) {
          setAlertasNoLeidasCount(data.filter((a: any) => !a.leida).length);
        }
      } catch (error) {
        console.error('Error cargando contador de alertas:', error);
      }
    };
    cargarContadorAlertas();
  }, []);

  /* ============================================================
     GENERAR ALERTAS
     ============================================================ */
  const handleGenerarAlertas = async () => {
    setGenerandoAlertas(true);
    setMensajeAlertas('');
    try {
      const response = await fetch('/api/generar-alertas', { method: 'POST' });
      const data = await response.json();

      if (data?.success) {
        setMensajeAlertas(data.message || 'Alertas generadas.');
        const noLeidas = (data.alertas || []).filter((a: any) => !a.leida);
        setAlertasNoLeidasCount(noLeidas.length);
      } else {
        setMensajeAlertas(data?.message || 'Error al generar alertas');
      }
    } catch (error) {
      console.error('Error al generar alertas:', error);
      setMensajeAlertas('Error de red al generar alertas.');
    } finally {
      setGenerandoAlertas(false);
    }
  };

  /* ============================================================
     LISTAS BASE
     ============================================================ */
  const customers = useMemo(
    () => [...new Set(pos.map(p => p.customer).filter(Boolean))].sort(),
    [pos]
  );
  const suppliers = useMemo(
    () => [...new Set(pos.map(p => p.supplier).filter(Boolean))].sort(),
    [pos]
  );
  const factories = useMemo(
    () => [...new Set(pos.map(p => p.factory).filter(Boolean))].sort(),
    [pos]
  );
  const seasons = useMemo(
    () => [...new Set(pos.map(p => (p as any)?.season).filter(Boolean))].sort(),
    [pos]
  );

  useEffect(() => {
    if (seasons.length > 0 && exportSeasons.length === 0) {
      setExportSeasons(seasons);
    }
  }, [seasons, exportSeasons.length]);

  /* ============================================================
     ESTILOS DISPONIBLES
     ============================================================ */
  const preStyleFiltered = useMemo(() => {
    return pos.filter(po => {
      if (filters.customer !== 'todos' && po.customer !== filters.customer) return false;
      if (filters.supplier !== 'todos' && po.supplier !== filters.supplier) return false;
      if (filters.factory !== 'todos' && po.factory !== filters.factory) return false;
      if (filters.season !== 'todos' && (po as any)?.season !== filters.season) return false;
      return true;
    });
  }, [pos, filters.customer, filters.supplier, filters.factory, filters.season]);

  const availableStyles = useMemo(() => {
    const all = preStyleFiltered.flatMap(po => getStylesFromPO(po));
    return [...new Set(all)].sort();
  }, [preStyleFiltered]);

  useEffect(() => {
    if (filters.style !== 'todos' && !availableStyles.includes(filters.style)) {
      setFilters(prev => ({ ...prev, style: 'todos' }));
    }
  }, [availableStyles, filters.style]);

  /* ============================================================
     FILTROS
     ============================================================ */
  useEffect(() => {
    let result = preStyleFiltered;

    if (filters.style !== 'todos') {
      result = result.filter(po => getStylesFromPO(po).includes(filters.style));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(po => {
        const hayCampo = (s?: string) => (s || '').toLowerCase().includes(q);
        const styles = getStylesFromPO(po).join(' ').toLowerCase();
        return (
          hayCampo(po.po) ||
          hayCampo(po.customer) ||
          hayCampo(po.supplier) ||
          hayCampo(po.factory) ||
          hayCampo((po as any)?.season) ||
          styles.includes(q)
        );
      });
    }

    setFilteredPOs(result);
  }, [preStyleFiltered, filters.style, filters.search]);

  /* ============================================================
     MÉTRICAS
     ============================================================ */
  const totalPOs = pos.length;
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const totalFactories = factories.length;
  const activePOs = pos.length;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  /* ============================================================
     EXPORTACIÓN A CHINA
     ============================================================ */
  const toggleExportSeason = (season: string) => {
    setExportSeasons(prev =>
      prev.includes(season)
        ? prev.filter(s => s !== season)
        : [...prev, season]
    );
  };

  const handleExportChina = () => {
    if (exportSeasons.length === 0) {
      alert('Selecciona al menos una temporada para exportar.');
      return;
    }
    const qs = exportSeasons.join(',');
    window.location.href = `/api/export-china?seasons=${encodeURIComponent(qs)}`;
  };

  /* ============================================================
     IMPORTAR DESDE CHINA (CON MODAL)
     ============================================================ */
  const handleChinaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setChinaFile(file);
    setImportChinaMsg('');
  };

  const handleImportChina = async () => {
    if (!chinaFile) {
      alert("Selecciona un archivo de China (.xlsx) primero.");
      return;
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
        setReportContent(json.error || "Error al importar el archivo.");
        setShowReport(true);
        return;
      }

      const resumen =
        `Importación completada: ` +
        `• POs encontrados: ${json.pos_encontrados}\n` +
        `• Líneas actualizadas: ${json.lineas_actualizadas}\n` +
        `• Muestras actualizadas: ${json.muestras_actualizadas}\n` +
        `• Avisos: ${json.avisos.length}\n` +
        `• Errores: ${json.errores.length}`;

      const report = json.detalles?.report || "No se han detectado cambios.";
      const finalText = `${resumen}\n\n${report}`;

      setReportContent(finalText);
      setShowReport(true);

    } catch (error) {
      console.error("Error importando archivo de China:", error);
      setReportContent("❌ Error de red al importar el archivo.");
      setShowReport(true);

    } finally {
      setImportingChina(false);
    }
  };

  /* ============================================================
     RETURN UI
     ============================================================ */
  if (loading) return <div className="container mx-auto py-6">Cargando...</div>;

  return (
    <>
      {/* ================= MODAL ================== */}
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        content={reportContent}
      />

      {/* ================= DASHBOARD NORMAL ================== */}
      <div className="container mx-auto py-6 space-y-6">

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Sistema de Producción</h1>
          <div className="flex space-x-2">
            <Link href="/po/nuevo/editar">
              <Button variant="default">Nuevo PO</Button>
            </Link>
            <Link href="/import">
              <Button variant="outline">Importar Datos</Button>
            </Link>
          </div>
        </div>

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

          {/* =======================================
              TAB DASHBOARD
              ======================================= */}
          <TabsContent value="dashboard" className="space-y-4">

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Total POs</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalPOs}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Customers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalCustomers}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Suppliers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalSuppliers}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-lg">Factories</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalFactories}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-lg">POs Activos</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{activePOs}</div></CardContent></Card>
            </div>

            {/* Exportar para China */}
            <Card>
              <CardHeader>
                <CardTitle>Exportar datos para China</CardTitle>
                <CardDescription>
                  Selecciona las temporadas cuyos pedidos quieres incluir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {seasons.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay temporadas disponibles.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 mb-4">
                      {seasons.map((season) => (
                        <label key={season} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={exportSeasons.includes(season)}
                            onChange={() => toggleExportSeason(season)}
                          />
                          <span>{season}</span>
                        </label>
                      ))}
                    </div>
                    <Button onClick={handleExportChina}>Exportar pedidos para China</Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Importar datos desde China */}
            <Card>
              <CardHeader>
                <CardTitle>Importar datos desde China</CardTitle>
                <CardDescription>Sube el archivo Excel de China.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <Input type="file" accept=".xlsx" onChange={handleChinaFileChange} />

                <Button onClick={handleImportChina} disabled={importingChina || !chinaFile}>
                  {importingChina ? 'Importando…' : 'Importar archivo de China'}
                </Button>
              </CardContent>
            </Card>

            {/* ========= Filtros ========= */}
            <Card>
              <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

                  {/* Customer */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer</label>
                    <Select value={filters.customer} onValueChange={(v) => setFilters({ ...filters, customer: v })}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {customers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Supplier</label>
                    <Select value={filters.supplier} onValueChange={(v) => setFilters({ ...filters, supplier: v })}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {suppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Factory */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Factory</label>
                    <Select value={filters.factory} onValueChange={(v) => setFilters({ ...filters, factory: v })}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {factories.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Season */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Season</label>
                    <Select value={filters.season} onValueChange={(v) => setFilters({ ...filters, season: v })}>
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        {seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Style</label>
                    <Select value={filters.style} onValueChange={(v) => setFilters({ ...filters, style: v })}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {availableStyles.length > 0
                          ? availableStyles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)
                          : <SelectItem value="none" disabled>(Sin estilos)</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <div className="mt-3">
                  <Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>
                </div>
              </CardContent>
            </Card>

            {/* ========= Tabla POs ========= */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Purchase Orders</CardTitle>
                <CardDescription>Todos los pedidos del sistema</CardDescription>
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
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredPOs.length > 0 ? (
                        filteredPOs.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-medium">{po.po}</TableCell>
                            <TableCell>{po.supplier}</TableCell>
                            <TableCell>{po.customer}</TableCell>
                            <TableCell>{po.factory}</TableCell>
                            <TableCell>{(po as any)?.season || '-'}</TableCell>
                            <TableCell>{po.po_date || '-'}</TableCell>
                            <TableCell>{po.etd_pi || '-'}</TableCell>
                            <TableCell><Badge variant="outline">Activo</Badge></TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Link href={`/po/${po.id}/editar`}>
                                  <Button variant="outline" size="sm">Editar</Button>
                                </Link>
                                <Link href={`/po/${po.id}`}>
                                  <Button variant="ghost" size="sm">Ver</Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4">
                            No se encontraron purchase orders con los filtros seleccionados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                  </Table>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* =======================================
              TAB ALERTAS
              ======================================= */}
          <TabsContent value="alertas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sistema de Alertas</h2>
              <div className="flex space-x-2">
                <Button onClick={handleGenerarAlertas} disabled={generandoAlertas} variant="outline">
                  {generandoAlertas ? 'Generando...' : 'Generar Alertas'}
                </Button>
              </div>
            </div>

            {mensajeAlertas && (
              <div className={`p-3 rounded-md ${
                mensajeAlertas.includes('Error')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {mensajeAlertas}
              </div>
            )}

            <AlertasDashboard />
          </TabsContent>

        </Tabs>
      </div>
    </>
  );
}
