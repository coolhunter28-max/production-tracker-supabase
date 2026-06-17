"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, Eye, Plus, Search, Trash2 } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Pedido = {
  id: string;
  cliente: string | null;
  estilo: string | null;
  last: string | null;
  outsole: string | null;
  cantidad: number | null;
  fecha_entrega: string | null;
  estado: string | null;
  prioridad: string | null;
  created_at?: string | null;
};

export function PedidosContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter] = useState("todos");

  async function fetchPedidos() {
    setLoading(true);

    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar pedidos:", error);
    } else {
      setPedidos((data ?? []) as Pedido[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchPedidos();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar este pedido?"
    );

    if (!confirmed) return;

    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar pedido:", error);
      return;
    }

    fetchPedidos();
  }

  function getEstadoBadge(estado: string | null) {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "en_produccion":
        return <Badge className="bg-blue-500 text-white">En Producción</Badge>;
      case "completado":
        return <Badge className="bg-green-500 text-white">Completado</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{estado || "-"}</Badge>;
    }
  }

  const filteredPedidos = pedidos.filter((pedido) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      String(pedido.cliente ?? "").toLowerCase().includes(search) ||
      String(pedido.estilo ?? "").toLowerCase().includes(search) ||
      String(pedido.last ?? "").toLowerCase().includes(search) ||
      String(pedido.outsole ?? "").toLowerCase().includes(search);

    const matchesEstado =
      estadoFilter === "todos" || pedido.estado === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search">Buscar</Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <Input
                  id="search"
                  placeholder="Buscar por cliente, estilo, last o outsole..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            Gestiona todos los pedidos del sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="py-4 text-center">Cargando pedidos...</p>
          ) : filteredPedidos.length === 0 ? (
            <p className="py-4 text-center">
              No se encontraron pedidos con los filtros seleccionados
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estilo</TableHead>
                    <TableHead>Last</TableHead>
                    <TableHead>Outsole</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">
                        {pedido.id}
                      </TableCell>
                      <TableCell>{pedido.cliente || "-"}</TableCell>
                      <TableCell>{pedido.estilo || "-"}</TableCell>
                      <TableCell>{pedido.last || "-"}</TableCell>
                      <TableCell>{pedido.outsole || "-"}</TableCell>
                      <TableCell>{pedido.cantidad ?? "-"}</TableCell>
                      <TableCell>
                        {pedido.fecha_entrega
                          ? new Date(pedido.fecha_entrega).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>{getEstadoBadge(pedido.estado)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pedido.prioridad === "alta" ||
                            pedido.prioridad === "urgente"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {pedido.prioridad || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/po/${pedido.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Link href={`/po/${pedido.id}/editar`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pedido.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}