'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase' // <-- AÑADE ESTA LÍNEA
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert' // <-- AÑADE ESTA LÍNEA

interface Pedido {
  id?: string
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

interface PedidoFormProps {
  pedido?: Pedido
  onSave: (pedido: Pedido) => void
  onCancel: () => void
}

export default function PedidoForm({ pedido, onSave, onCancel }: PedidoFormProps) {
  const [formData, setFormData] = useState<Pedido>({
    id: pedido?.id || '',
    cliente: pedido?.cliente || '',
    estilo: pedido?.estilo || '',
    last: pedido?.last || '',
    outsole: pedido?.outsole || '',
    cantidad: pedido?.cantidad || 0,
    fechaEntrega: pedido?.fechaEntrega || '',
    estado: pedido?.estado || 'pendiente',
    prioridad: pedido?.prioridad || 'media',
    notas: pedido?.notas || ''
  })
  
  // AÑADE ESTOS ESTADOS
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // MODIFICA ESTA FUNCIÓN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      let savedPedido: Pedido
      
      if (pedido?.id) {
        // Actualizar pedido existente
        const { data, error } = await supabase
          .from('pedidos')
          .update({
            cliente: formData.cliente,
            estilo: formData.estilo,
            last: formData.last,
            outsole: formData.outsole,
            cantidad: formData.cantidad,
            fecha_entrega: formData.fechaEntrega, // Nota: usa fecha_entrega en lugar de fechaEntrega
            estado: formData.estado,
            prioridad: formData.prioridad,
            notas: formData.notas
          })
          .eq('id', pedido.id)
          .select()
        
        if (error) throw error
        
        savedPedido = { ...formData, id: pedido.id }
      } else {
        // Crear nuevo pedido
        const { data, error } = await supabase
          .from('pedidos')
          .insert([{
            cliente: formData.cliente,
            estilo: formData.estilo,
            last: formData.last,
            outsole: formData.outsole,
            cantidad: formData.cantidad,
            fecha_entrega: formData.fechaEntrega, // Nota: usa fecha_entrega en lugar de fechaEntrega
            estado: formData.estado,
            prioridad: formData.prioridad,
            notas: formData.notas
          }])
          .select()
        
        if (error) throw error
        
        // El nuevo pedido tiene un id generado por Supabase
        savedPedido = { ...formData, id: data[0].id }
      }
      
      // Llamar a onSave con el pedido guardado
      onSave(savedPedido)
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof Pedido, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {pedido?.id ? 'Editar Pedido' : 'Nuevo Pedido'}
        </CardTitle>
        <CardDescription>
          {pedido?.id ? 'Modifica los datos del pedido existente' : 'Completa los datos para crear un nuevo pedido'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* AÑADE ESTO PARA MOSTRAR ERRORES */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Nombre del cliente"
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estilo">Estilo</Label>
              <Input
                id="estilo"
                value={formData.estilo}
                onChange={(e) => handleChange('estilo', e.target.value)}
                placeholder="Estilo del producto"
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last">Last</Label>
              <Input
                id="last"
                value={formData.last}
                onChange={(e) => handleChange('last', e.target.value)}
                placeholder="Código del last"
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outsole">Outsole</Label>
              <Input
                id="outsole"
                value={formData.outsole}
                onChange={(e) => handleChange('outsole', e.target.value)}
                placeholder="Código del outsole"
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                value={formData.cantidad}
                onChange={(e) => handleChange('cantidad', parseInt(e.target.value) || 0)}
                placeholder="Cantidad de pares"
                min="1"
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEntrega">Fecha de Entrega</Label>
              <Input
                id="fechaEntrega"
                type="date"
                value={formData.fechaEntrega}
                onChange={(e) => handleChange('fechaEntrega', e.target.value)}
                required
                disabled={loading} // AÑADE ESTO
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => handleChange('estado', value as any)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_produccion">En Producción</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Select value={formData.prioridad} onValueChange={(value) => handleChange('prioridad', value as any)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              placeholder="Notas adicionales sobre el pedido..."
              rows={3}
              disabled={loading} // AÑADE ESTO
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (pedido?.id ? 'Actualizar Pedido' : 'Crear Pedido')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}