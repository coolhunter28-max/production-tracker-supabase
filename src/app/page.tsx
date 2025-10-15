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

export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState('');

  // Carga inicial de POs
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

  // Contador de alertas no leídas
  useEffect(() => {
    const cargarContadorAlertas = async () => {
      try {
        const res = await fetch('/api/alertas?leida=false', { cache: 'no-store' });
        const data = await res.json();
        if (data?.success) {
          setAlertasNoLeidasCount(data.alertas.length);
        } else if (Array.isArray(data)) {
          // por si la API devuelve directamente array
          setAlertasNoLeidasCount(data.filter((a: any) => !a.leida).length);
        }
      } catch (error) {
        console.error('Error cargando contador de alertas:', error);
      }
    };
    cargarContadorAlertas();
  }, []);

  // Generar alertas
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

  // Listas base (no dependientes)
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

  // Aplica filtros *excepto* style y search (para calcular styles disponibles dinámicamente)
  const preStyleFiltered = useMemo(() => {
    return pos.filter(po => {
      if (filters.customer !== 'todos' && po.customer !== filters.customer) return false;
      if (filters.supplier !== 'todos' && po.supplier !== filters.supplier) return false;
      if (filters.factory !== 'todos' && po.factory !== filters.factory) return false;
      if (filters.season !== 'todos' && (po as any)?.season !== filters.season) return false;
      return true;
    });
  }, [pos, filters.customer, filters.supplier, filters.factory, filters.season]);

  // Styles disponibles (dependen de los otros filtros)
  const availableStyles = useMemo(() => {
    const all = preStyleFiltered.flatMap(po => getStylesFromPO(po));
    return [...new Set(all)].sort();
  }, [preStyleFiltered]);

  // Si el style seleccionado deja de estar disponible al cambiar otros filtros, resetear a "todos"
  useEffect(() => {
    if (filters.style !== 'todos' && !availableStyles.includes(filters.style)) {
      setFilters(prev => ({ ...prev, style: 'todos' }));
    }
  }, [availableStyles, filters.style]);

  // Aplicar todos los filtros (incluye style y search)
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

  // Métricas
  const totalPOs = pos.length;
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const totalFactories = factories.length;
  const activePOs = pos.length;

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  if (loading) return <div className="container mx-auto py-6">Cargando...</div>;

  return (
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

        <TabsContent value="dashboard" className="space-y-4">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Total POs</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalPOs}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Customers</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalCustomers}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Suppliers</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalSuppliers}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Factories</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalFactories}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">POs Activos</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{activePOs}</div></CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <Select
                    value={filters.customer}
                    onValueChange={(value) => setFilters({ ...filters, customer: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <Select
                    value={filters.supplier}
                    onValueChange={(value) => setFilters({ ...filters, supplier: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Factory */}
                <div>
                  <label className="block text-sm font-medium mb-1">Factory</label>
                  <Select
                    value={filters.factory}
                    onValueChange={(value) => setFilters({ ...filters, factory: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {factories.map((factory) => (
                        <SelectItem key={factory} value={factory}>{factory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Season */}
                <div>
                  <label className="block text-sm font-medium mb-1">Season</label>
                  <Select
                    value={filters.season}
                    onValueChange={(value) => setFilters({ ...filters, season: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {seasons.map((season) => (
                        <SelectItem key={season} value={season}>{season}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style (dependiente) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Style</label>
                  <Select
                    value={filters.style}
                    onValueChange={(value) => setFilters({ ...filters, style: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {availableStyles.length === 0 ? (
                        <SelectItem value="__no_styles__" disabled>
                          (Sin estilos disponibles)
                        </SelectItem>
                      ) : (
                        availableStyles.map((st) => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Buscar */}
                <div>
                  <label className="block text-sm font-medium mb-1">Buscar</label>
                  <Input
                    placeholder="PO, Customer, Supplier, Factory, Style..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3">
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla POs */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Purchase Orders</CardTitle>
              <CardDescription>Lista de todos los pedidos registrados en el sistema</CardDescription>
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

        {/* Tab Alertas */}
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
            <div className={`p-3 rounded-md ${mensajeAlertas.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {mensajeAlertas}
            </div>
          )}

          <AlertasDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
