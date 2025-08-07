'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Calendar, Package, User, Flag, FileText, X } from 'lucide-react'

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

interface PedidoViewProps {
  pedido: Pedido | null
  isOpen: boolean
  onClose: () => void
  onEdit: (pedido: Pedido) => void
}

export default function PedidoView({ pedido, isOpen, onClose, onEdit }: PedidoViewProps) {
  if (!pedido) return null

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

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente'
      case 'en_produccion': return 'En Producción'
      case 'completado': return 'Completado'
      default: return estado
    }
  }

  const getPriorityText = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'Alta'
      case 'media': return 'Media'
      case 'baja': return 'Baja'
      default: return prioridad
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles del Pedido</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Información completa del pedido {pedido.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información principal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">ID Pedido</p>
                  <p className="text-lg font-semibold">{pedido.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cliente</p>
                  <p className="text-lg font-semibold">{pedido.cliente}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estilo</p>
                  <p className="text-lg font-semibold">{pedido.estilo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cantidad</p>
                  <p className="text-lg font-semibold">{pedido.cantidad} pares</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalles técnicos */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Last</p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">{pedido.last}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Outsole</p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">{pedido.outsole}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado y prioridad */}
          <Card>
            <CardHeader>
              <CardTitle>Estado y Prioridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Estado</p>
                  <Badge className={getStatusColor(pedido.estado)}>
                    {getStatusText(pedido.estado)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Prioridad</p>
                  <Badge className={getPriorityColor(pedido.prioridad)}>
                    {getPriorityText(pedido.prioridad)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fecha de entrega */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fecha de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {new Date(pedido.fechaEntrega).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>

          {/* Notas */}
          {pedido.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{pedido.notas}</p>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => onEdit(pedido)}>
              Editar Pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
