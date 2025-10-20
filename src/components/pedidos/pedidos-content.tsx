'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react'
import Link from 'next/link'

export function PedidosContent() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('todos')

  useEffect(() => {
    fetchPedidos()
  }, [])

  const fetchPedidos = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar pedidos:', error)
    } else {
      setPedidos(data || [])
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error al eliminar pedido:', error)
      } else {
        fetchPedidos()
      }
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'en_produccion':
        return <Badge className="bg-blue-500 text-white">En Producción</Badge>
      case 'completado':
        return <Badge className="bg-green-500 text-white">Completado</Badge>
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  // Filtrar pedidos según búsqueda y estado
  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch =
      searchTerm === '' ||
      pedido.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.estilo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.last?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.outsole?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesEstado =
      estadoFilter === 'todos' || pedido.estado === estadoFilter

    return matchesSearch && matchesEstado
  })

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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

      {/* Tabla de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            Gestiona todos los pedidos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando pedidos...</p>
          ) : filteredPedidos.length === 0 ? (
            <p className="text-center py-4">
              No se encontraron pedidos con los filtros seleccionados
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
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
                      <TableCell className="font-medium">{pedido.id}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>{pedido.estilo}</TableCell>
                      <TableCell>{pedido.last}</TableCell>
                      <TableCell>{pedido.outsole}</TableCell>
                      <TableCell>{pedido.cantidad}</TableCell>
                      <TableCell>
                        {new Date(pedido.fecha_entrega).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getEstadoBadge(pedido.estado)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pedido.prioridad === 'alta' ||
                            pedido.prioridad === 'urgente'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {pedido.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* 🔹 Ver detalle del pedido */}
                          <Link href={`/po/${pedido.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          {/* 🔹 Editar pedido */}
                          <Link href={`/po/${pedido.id}/editar`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>

                          {/* 🔹 Eliminar pedido */}
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
  )
}
