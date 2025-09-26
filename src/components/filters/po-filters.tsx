// src/components/filters/po-filters.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, Building, User, Calendar, Package, Factory } from 'lucide-react';

interface POFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    customer: string;
    supplier: string;
    factory: string; // Añadido factory
    season: string;
    status: string;
  }) => void;
  customers: string[];
  suppliers: string[];
  factories: string[]; // Añadido factories
  seasons: string[];
}

export function POFilters({ onFiltersChange, customers, suppliers, factories, seasons }: POFiltersProps) {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState('all');
  const [supplier, setSupplier] = useState('all');
  const [factory, setFactory] = useState('all'); // Añadido estado para factory
  const [season, setSeason] = useState('all');
  const [status, setStatus] = useState('all');

  const applyFilters = () => {
    onFiltersChange({ search, customer, supplier, factory, season, status });
  };

  const clearFilters = () => {
    setSearch('');
    setCustomer('all');
    setSupplier('all');
    setFactory('all'); // Resetear factory
    setSeason('all');
    setStatus('all');
    onFiltersChange({ search: '', customer: 'all', supplier: 'all', factory: 'all', season: 'all', status: 'all' });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Búsqueda general */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              <Search className="w-4 h-4 inline mr-1" />
              Búsqueda General
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por PO, style, color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtros específicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"> {/* Cambiado a 5 columnas */}
            {/* Filtro por Customer */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <User className="w-4 h-4 inline mr-1" />
                Customer
              </label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Supplier */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <Building className="w-4 h-4 inline mr-1" />
                Supplier
              </label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Factory - NUEVO */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <Factory className="w-4 h-4 inline mr-1" />
                Factory
              </label>
              <Select value={factory} onValueChange={setFactory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las factories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las factories</SelectItem>
                  {factories.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Season */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Season
              </label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las seasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las seasons</SelectItem>
                  {seasons.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <Package className="w-4 h-4 inline mr-1" />
                Estado
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="con-muestras">Con muestras</SelectItem>
                  <SelectItem value="sin-muestras">Sin muestras</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {search || customer !== 'all' || supplier !== 'all' || factory !== 'all' || season !== 'all' || status !== 'all' ? (
                <span>Filtros activos aplicados</span>
              ) : (
                <span>Sin filtros activos</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpiar Filtros
              </Button>
              <Button onClick={applyFilters}>
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}