"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Filters = {
  customer: string;
  supplier: string;
  factory: string;
  season: string;
  style: string;
  search: string;
};

export default function FiltersBox({
  customers,
  suppliers,
  factories,
  seasons,
  styles,
  filters,
  onChange,
  onClear,
}: {
  customers: string[];
  suppliers: string[];
  factories: string[];
  seasons: string[];
  styles: string[];
  filters: Filters;
  onChange: (field: keyof Filters, value: string) => void;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>

      <CardContent>
        {/* GRID DE FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

          {/* CUSTOMER */}
          <div>
            <label className="text-sm">Customer</label>
            <Select
              value={filters.customer}
              onValueChange={(v) => onChange("customer", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
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
              onValueChange={(v) => onChange("supplier", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
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
              onValueChange={(v) => onChange("factory", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
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
              onValueChange={(v) => onChange("season", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
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
              onValueChange={(v) => onChange("style", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {styles.map((st) => (
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
              onChange={(e) => onChange("search", e.target.value)}
              placeholder="PO / Supplier / Customer..."
            />
          </div>

        </div>

        {/* BOTÓN LIMPIAR */}
        <div className="mt-3">
          <Button variant="secondary" onClick={onClear}>
            Limpiar filtros
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
