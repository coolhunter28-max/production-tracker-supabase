'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, Eye, AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

export default function PedidosSimplePage() {
  const [pedidos, setPedidos] = useState([
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
      notas: 'Pedido urgente para cliente importante\nRequiere materiales especiales\nEntregar antes de la fecha límite'
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
      notas: 'Requiere revisión de materiales\nEsperar confirmación del cliente\nPrioridad media'
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
      prioridad: 'baja',
      notas: 'Entregado sin incidencias\nCliente satisfecho\nListo para facturación'
    }
  ])
  
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [editingPedido, setEditingPedido] = useState(null)
  const [viewingPedido, setViewingPedido] = useState(null)
  const [formData, setFormData] = useState({ 
    cliente: '', 
    estilo: '', 
    last: '', 
    outsole: '', 
    cantidad: 0, 
    fechaEntrega: '', 
    estado: 'pendiente', 
    prioridad: 'media',
    notas: ''
  })

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'en_produccion': return 'bg-blue-100 text-blue-800'
      case 'completado': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800'
      case 'media': return 'bg-orange-100 text-orange-800'
      case 'baja': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreatePedido = () => {
    const newPedido = {
      ...formData,
      id: `PED-${String(pedidos.length + 1).padStart(3, '0')}`,
      cantidad: parseInt(formData.cantidad)
    }
    setPedidos([...pedidos, newPedido])
    setShowForm(false)
    resetForm()
  }

  const handleEditPedido = (pedido) => {
    setEditingPedido(pedido)
    setFormData(pedido)
    setShowForm(true)
  }

  const handleUpdatePedido = () => {
    const updatedPedidos = pedidos.map(p => 
      p.id === editingPedido.id ? { ...formData, id: editingPedido.id } : p
    )
    setPedidos(updatedPedidos)
    setShowForm(false)
    setEditingPedido(null)
    resetForm()
  }

  const handleDeletePedido = (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      setPedidos(pedidos.filter(p => p.id !== id))
    }
  }

  const handleViewDetails = (pedido) => {
    setViewingPedido(pedido)
    setShowDetails(true)
  }

  const resetForm = () => {
    setFormData({ 
      cliente: '', 
      estilo: '', 
      last: '', 
      outsole: '', 
      cantidad: 0, 
      fechaEntrega: '', 
      estado: 'pendiente', 
      prioridad: 'media',
      notas: ''
    })
  }

  const handleNewPedido = () => {
    resetForm()
    setEditingPedido(null)
    setShowForm(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-gray-600 mt-2">Administra y monitorea todos los pedidos de producción</p>
        </div>
        <Button onClick={handleNewPedido} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
            <p className="text-xs text-muted-foreground">Total en sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">En Producción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'en_produccion').length}</div>
            <p className="text-xs text-muted-foreground">Activos actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'pendiente').length}</div>
            <p className="text-xs text-muted-foreground">Por iniciar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.filter(p => p.estado === 'completado').length}</div>
            <p className="text-xs text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>Visualiza y gestiona todos los pedidos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estilo</TableHead>
                  <TableHead>Last</TableHead>
                  <TableHead>Outsole</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
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
                          onClick={() => handleViewDetails(pedido)}
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
                          onClick={() => handleDeletePedido(pedido.id)}
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

      {/* Modal para crear/editar pedido */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPedido ? 'Editar Pedido' : 'Nuevo Pedido'}
            </DialogTitle>
            <DialogDescription>
              {editingPedido ? 'Modifica los datos del pedido existente' : 'Completa los datos para crear un nuevo pedido'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <Input
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estilo</label>
                <Input
                  value={formData.estilo}
                  onChange={(e) => setFormData({...formData, estilo: e.target.value})}
                  placeholder="Estilo del producto"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last</label>
                <Input
                  value={formData.last}
                  onChange={(e) => setFormData({...formData, last: e.target.value})}
                  placeholder="Código del last"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Outsole</label>
                <Input
                  value={formData.outsole}
                  onChange={(e) => setFormData({...formData, outsole: e.target.value})}
                  placeholder="Código del outsole"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cantidad</label>
                <Input
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 0})}
                  placeholder="Cantidad de pares"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha Entrega</label>
                <Input
                  type="date"
                  value={formData.fechaEntrega}
                  onChange={(e) => setFormData({...formData, fechaEntrega: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_produccion">En Producción</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={formData.prioridad} onValueChange={(value) => setFormData({...formData, prioridad: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                placeholder="Notas adicionales sobre el pedido...
Puedes escribir múltiples líneas usando Enter"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puedes escribir múltiples líneas usando la tecla Enter
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={editingPedido ? handleUpdatePedido : handleCreatePedido}>
              {editingPedido ? 'Actualizar Pedido' : 'Crear Pedido'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para ver detalles */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido {viewingPedido?.id}</DialogTitle>
            <DialogDescription>Información completa del pedido seleccionado</DialogDescription>
          </DialogHeader>
          
          {viewingPedido && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">ID Pedido</p>
                <p className="font-medium">{viewingPedido.id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{viewingPedido.cliente}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Estilo</p>
                <p className="font-medium">{viewingPedido.estilo}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Last</p>
                <p className="font-medium">{viewingPedido.last}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Outsole</p>
                <p className="font-medium">{viewingPedido.outsole}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cantidad</p>
                <p className="font-medium">{viewingPedido.cantidad} pares</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Fecha Entrega</p>
                <p className="font-medium">{viewingPedido.fechaEntrega}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge className={getStatusColor(viewingPedido.estado)}>
                  {viewingPedido.estado === 'pendiente' && 'Pendiente'}
                  {viewingPedido.estado === 'en_produccion' && 'En Producción'}
                  {viewingPedido.estado === 'completado' && 'Completado'}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <Badge className={getPriorityColor(viewingPedido.prioridad)}>
                  {viewingPedido.prioridad === 'alta' && 'Alta'}
                  {viewingPedido.prioridad === 'media' && 'Media'}
                  {viewingPedido.prioridad === 'baja' && 'Baja'}
                </Badge>
              </div>
              <div className="space-y-2 col-span-2">
                <p className="text-sm font-medium">Notas</p>
                <div className="p-3 bg-gray-50 rounded-md border min-h-[100px] whitespace-pre-wrap">
                  {viewingPedido.notas || 'No hay notas adicionales'}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
