// src/components/muestras/muestra-form.tsx
'use client';

import { useState } from 'react';
import { createMuestra } from '@/services/muestras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface MuestraFormProps {
  lineaId: string;
  onSuccess: () => void;
}

export function MuestraForm({ lineaId, onSuccess }: MuestraFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    tipo_muestra: '',
    round: '1',
    fecha_muestra: '',
    estado_muestra: 'pendiente' as 'enviada' | 'recibida' | 'aprobada' | 'rechazada',
    notas: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createMuestra({
        linea_pedido_id: lineaId,
        tipo_muestra: formData.tipo_muestra,
        round: parseInt(formData.round),
        fecha_muestra: formData.fecha_muestra || null,
        estado_muestra: formData.estado_muestra,
        notas: formData.notas || null
      });

      setFormData({
        tipo_muestra: '',
        round: '1',
        fecha_muestra: '',
        estado_muestra: 'pendiente',
        notas: ''
      });
      setShowDialog(false);
      onSuccess();
    } catch (error) {
      console.error('Error creando muestra:', error);
      alert('Error al crear la muestra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Muestra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Muestra</DialogTitle>
          <DialogDescription>
            Registra una nueva muestra para esta línea de pedido
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tipo_muestra">Tipo de Muestra *</Label>
            <Select 
              value={formData.tipo_muestra} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_muestra: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo de muestra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CFMs">CFMs</SelectItem>
                <SelectItem value="Counter Sample">Counter Sample</SelectItem>
                <SelectItem value="Fitting">Fitting</SelectItem>
                <SelectItem value="PPS">PPS</SelectItem>
                <SelectItem value="Testing Samples">Testing Samples</SelectItem>
                <SelectItem value="Shipping Samples">Shipping Samples</SelectItem>
                <SelectItem value="Inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="round">Round *</Label>
            <Input
              id="round"
              type="number"
              min="1"
              value={formData.round}
              onChange={(e) => setFormData(prev => ({ ...prev, round: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="fecha_muestra">Fecha Muestra</Label>
            <Input
              id="fecha_muestra"
              type="date"
              value={formData.fecha_muestra}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_muestra: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="estado_muestra">Estado *</Label>
            <Select 
              value={formData.estado_muestra} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, estado_muestra: value as any }))}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="recibida">Recibida</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Notas adicionales sobre la muestra"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.tipo_muestra}>
              {loading ? 'Guardando...' : 'Crear Muestra'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}