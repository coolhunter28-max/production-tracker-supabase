"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  customers: string[];
  suppliers: string[];
  factories: string[];
  seasons: string[];
  styles: string[];
  filters: any;
  setFilters: (f: any) => void;
  clearFilters: () => void;
};

export default function FiltersBox({
  customers,
  suppliers,
  factories,
  seasons,
  styles,
  filters,
  setFilters,
  clearFilters
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

      {/* CUSTOMER */}
      <div>
        <label className="text-sm">Customer</label>
        <Select value={filters.customer} onValueChange={(v) => setFilters({ ...filters, customer: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* SUPPLIER */}
      <div>
        <label className="text-sm">Supplier</label>
        <Select value={filters.supplier} onValueChange={(v) => setFilters({ ...filters, supplier: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* FACTORY */}
      <div>
        <label className="text-sm">Factory</label>
        <Select value={filters.factory} onValueChange={(v) => setFilters({ ...filters, factory: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {factories.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* SEASON */}
      <div>
        <label className="text-sm">Season</label>
        <Select value={filters.season} onValueChange={(v) => setFilters({ ...filters, season: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* STYLE */}
      <div>
        <label className="text-sm">Style</label>
        <Select value={filters.style} onValueChange={(v) => setFilters({ ...filters, style: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {styles.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* BUSCADOR */}
      <div>
        <label className="text-sm">Buscar</label>
        <Input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="PO, Supplier, Customer…"
        />
      </div>

      <div className="col-span-full mt-2">
        <Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>
      </div>
    </div>
  );
}
