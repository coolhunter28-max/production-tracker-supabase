'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Filter, Plus, Eye, Edit, Trash2, AlertCircle } from 'lucide-react'
import PedidoForm from '@/components/pedidos/pedido-form'
import PedidoView from '@/components/pedidos/pedido-view'

interface Pedido {
  id: string
  cliente: string
  estilo: string
  last: string
  outsole: string
  cantidad: number
  fechaEntrega: string
  estado: 'pendiente' | 'en_produccion' | 'completado'
  prioridad: 'alta' | 'media' | 'baja'
  notas?: string
}

export default function PedidosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pedidos, setPedidos] = useState<Pedido[]>([
    {
      id: 'PED-001',
      cliente: 'BSG_Arigato Marathon',
      estilo: 'MOD 1',
      last: 'DK124-1075',
      outsole: 'DIC-8941',
      cantidad: 1000,
      fechaEntrega: '2024-03-15',
      estado: 'en_produccion',
      prioridad: 'alta',
      notas: 'Pedido urgente para cliente importante'
    },
    {
      id: 'PED-002',
      cliente: 'BSG_Balmain',
      estilo: 'MOD 2',
      last: 'DK240628',
      outsole: 'DIC-8920',
      cantidad: 750,
      fechaEntrega: '2024-03-20',
      estado: 'pendiente',
      prioridad: 'media',
      notas: 'Requiere revisión de materiales'
    },
    {
      id: 'PED-003',
      cliente: 'BSG_Brownie_Bibi Lou',
      estilo: 'MOD 3',
      last: 'DK240628',
      outsole: 'MT-25303-1',
      cantidad: 1500,
      fechaEntrega: '2024-03-25',
      estado: 'completado',
      prioridad: 'baja'
    }
  ])
  
  // Estados para modales
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null)
  const [viewingPedido, setViewingPedido] = useState<Pedido | null>(null)
  const [deletingPedido, setDeletingPedido] = useState<Pedido | null>(null)

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'en_produccion': return 'bg-blue-100 text-blue-800'
      case 'completado': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800'
      case 'media': return 'bg-orange-100 text-orange-800'
      case 'baja': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.estilo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || pedido.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  // Funciones para manejar acciones
  const handleCreatePedido = () => {
    setEditingPedido(null)
    setShowForm(true)
  }

  const handleEditPedido = (pedido: Pedido) => {
    setEditingPedido(pedido)
    setShowForm(true)
  }

  const handleViewPedido = (pedido: Pedido) => {
    setViewingPedido(pedido)
    setShowView(true)
  }

  const handleDeletePedido = (pedido: Pedido) => {
    setDeletingPedido(pedido)
    setShowDeleteConfirm(true)
  }

  const handleSavePedido = (pedidoData: Pedido) => {
    if (editingPedido) {
      // Editar pedido existente
      setPedidos(prev => prev.map(p => 
        p.id === editingPedido.id ? { ...pedidoData, id: editingPedido.id } : p
      ))
    } else {
      // Crear nuevo pedido
      const newPedido: Pedido = {
        ...pedidoData,
        id: `PED-${String(pedidos.length + 1).padStart(3, '0')}`
      }
      setPedidos(prev => [...prev, newPedido])
    }
    setShowForm(false)
    setEditingPedido(null)
  }

  const handleConfirmDelete = () => {
    if (deletingPedido) {
      setPedidos(prev => prev.filter(p => p.id !== deletingPedido.id))
      setShowDeleteConfirm(false)
      setDeletingPedido(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-gray-600 mt-2">Administra y monitorea todos los pedidos de producción</p>
        </div>
        <Button onClick={handleCreatePedido} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Resumen de pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
            <p className="text-xs text-muted-foreground">+2 desde la última semana</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Producción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'en_produccion').length}</div>
            <p className="text-xs text-muted-foreground">Activos actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'pendiente').length}</div>
            <p className="text-xs text-muted-foreground">Por iniciar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'completado').length}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>Visualiza y gestiona todos los pedidos activos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente, estilo o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_produccion">En Producción</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Más Filtros
            </Button>
          </div>

          {/* Tabla de pedidos */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
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
                    <TableCell>{pedido.fechaEntrega}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pedido.estado)}>
                        {pedido.estado === 'pendiente' && 'Pendiente'}
                        {pedido.estado === 'en_produccion' && 'En Producción'}
                        {pedido.estado === 'completado' && 'Completado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(pedido.prioridad)}>
                        {pedido.prioridad === 'alta' && 'Alta'}
                        {pedido.prioridad === 'media' && 'Media'}
                        {pedido.prioridad === 'baja' && 'Baja'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewPedido(pedido)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditPedido(pedido)}
                          title="Editar pedido"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeletePedido(pedido)}
                          title="Eliminar pedido"
                          className="text-red-600 hover:text-red-800"
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
        </CardContent>
      </Card>

      {/* Modal para formulario de creación/edición */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PedidoForm
            pedido={editingPedido}
            onSave={handleSavePedido}
            onCancel={() => {
              setShowForm(false)
              setEditingPedido(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para vista detallada */}
      <PedidoView
        pedido={viewingPedido}
        isOpen={showView}
        onClose={() => {
          setShowView(false)
          setViewingPedido(null)
        }}
        onEdit={(pedido) => {
          setShowView(false)
          setViewingPedido(null)
          handleEditPedido(pedido)
        }}
      />

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el pedido {deletingPedido?.id}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta acción eliminará permanentemente el pedido y toda su información asociada.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}