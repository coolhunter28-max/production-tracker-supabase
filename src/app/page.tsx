// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchPOs } from '@/services/pos';
import { PO } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import AlertasDashboard from '@/components/alertas/AlertasDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    customer: 'todos',
    supplier: 'todos',
    factory: 'todos',
    style: 'todos',
    status: 'todos',
    search: ''
  });
  const [alertasNoLeidasCount, setAlertasNoLeidasCount] = useState(0);
  const [generandoAlertas, setGenerandoAlertas] = useState(false);
  const [mensajeAlertas, setMensajeAlertas] = useState('');

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

  useEffect(() => {
    const cargarContadorAlertas = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false", { cache: "no-store" });
        const data = await res.json();
        if (data.success) {
          setAlertasNoLeidasCount(data.alertas.length);
        }
      } catch (error) {
        console.error("Error cargando contador de alertas:", error);
      }
    };
    cargarContadorAlertas();
  }, []);

  const handleGenerarAlertas = async () => {
    setGenerandoAlertas(true);
    setMensajeAlertas('');
    
    try {
      const response = await fetch('/api/generar-alertas', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMensajeAlertas('✅ Alertas generadas correctamente.');
        const noLeidas = data.alertas?.filter((a: any) => !a.leida) || [];
        setAlertasNoLeidasCount(noLeidas.length);
      } else {
        setMensajeAlertas('⚠️ No se generaron nuevas alertas.');
      }
    } catch (error) {
      console.error('Error al generar alertas:', error);
      setMensajeAlertas('Error de red al generar alertas.');
    } finally {
      setGenerandoAlertas(false);
    }
  };

  useEffect(() => {
    let result = pos;
    
    if (filters.customer !== 'todos') {
      result = result.filter(po => po.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    }
    if (filters.supplier !== 'todos') {
      result = result.filter(po => po.supplier.toLowerCase().includes(filters.supplier.toLowerCase()));
    }
    if (filters.factory !== 'todos') {
      result = result.filter(po => po.factory.toLowerCase().includes(filters.factory.toLowerCase()));
    }
    if (filters.search) {
      result = result.filter(po => 
        po.po.toLowerCase().includes(filters.search.toLowerCase()) ||
        po.customer.toLowerCase().includes(filters.search.toLowerCase()) ||
        po.supplier.toLowerCase().includes(filters.search.toLowerCase()) ||
        po.factory.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    setFilteredPOs(result);
  }, [pos, filters]);

  const customers = [...new Set(pos.map(po => po.customer))].filter(Boolean);
  const suppliers = [...new Set(pos.map(po => po.supplier))].filter(Boolean);
  const factories = [...new Set(pos.map(po => po.factory))].filter(Boolean);
  const totalPOs = pos.length;
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const totalFactories = factories.length;
  const activePOs = pos.length;

  if (loading) return <div className="container mx-auto py-6">Cargando...</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* CABECERA */}
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
        
        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card><CardHeader><CardTitle>Total POs</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalPOs}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Customers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalCustomers}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Suppliers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalSuppliers}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Factories</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalFactories}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>POs Activos</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{activePOs}</div></CardContent></Card>
          </div>

          {/* FILTROS */}
          <Card>
            <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <Select value={filters.customer} onValueChange={(value) => setFilters({...filters, customer: value})}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <Select value={filters.supplier} onValueChange={(value) => setFilters({...filters, supplier: value})}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Factory</label>
                  <Select value={filters.factory} onValueChange={(value) => setFilters({...filters, factory: value})}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {factories.map(factory => (
                        <SelectItem key={factory} value={factory}>{factory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Buscar</label>
                  <Input
                    placeholder="PO, Customer, Supplier, Factory..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABLA DE POs */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Purchase Orders</CardTitle>
              <CardDescription>Lista de todos los pedidos registrados</CardDescription>
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
                          <TableCell>{po.season}</TableCell>
                          <TableCell>{po.po_date || '-'}</TableCell>
                          <TableCell>{po.etd_pi || '-'}</TableCell>
                          <TableCell><Badge variant="outline">Activo</Badge></TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Link href={`/po/${po.id}/editar`}><Button variant="outline" size="sm">Editar</Button></Link>
                              <Link href={`/po/${po.id}`}><Button variant="ghost" size="sm">Ver</Button></Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          No se encontraron POs con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB ALERTAS */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sistema de Alertas</h2>
            <Button onClick={handleGenerarAlertas} disabled={generandoAlertas} variant="outline">
              {generandoAlertas ? 'Generando...' : 'Generar Alertas'}
            </Button>
          </div>

          {mensajeAlertas && (
            <div
              className={`p-3 rounded-md ${
                mensajeAlertas.includes('Error')
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
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
