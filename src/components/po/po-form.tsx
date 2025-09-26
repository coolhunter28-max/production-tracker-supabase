// src/components/pedidos/po-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { PO, LineaPedido } from '@/types';
import { createPO, updatePO } from '@/services/pos';
import { fetchLineasByPOId, createLineaPedido, updateLineaPedido, deleteLineaPedido } from '@/services/lineasPedido';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Edit } from 'lucide-react';

interface POFormProps {
  po?: PO;
  onSuccess: () => void;
  onCancel: () => void;
}

interface LineaFormData {
  id?: string;
  reference: string;
  style: string;
  color: string;
  size_run: string;
  qty: string;
  category: string;
  price: string;
  amount: string;
  pi_bsg: string;
  price_selling: string;
  amount_selling: string;
  trial_upper: string;
  trial_lasting: string;
  lasting: string;
  finish_date: string;
}

export function POForm({ po, onSuccess, onCancel }: POFormProps) {
  const [formData, setFormData] = useState({
    po: po?.po || '',
    supplier: po?.supplier || '',
    season: po?.season || '',
    customer: po?.customer || '',
    factory: po?.factory || '',
    po_date: po?.po_date || '',
    etd_pi: po?.etd_pi || '',
    pi: po?.pi || '',
    channel: po?.channel || '',
    booking: po?.booking || '',
    closing: po?.closing || '',
    shipping_date: po?.shipping_date || ''
  });

  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLineaDialog, setShowLineaDialog] = useState(false);
  const [editingLinea, setEditingLinea] = useState<LineaFormData | null>(null);

  useEffect(() => {
    if (po) {
      loadLineas();
    }
  }, [po]);

  const loadLineas = async () => {
    if (!po) return;
    try {
      const lineasData = await fetchLineasByPOId(po.id!);
      setLineas(lineasData);
    } catch (error) {
      console.error('Error cargando líneas:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let poId;
      if (po) {
        // Actualizar PO existente
        const updatedPO = await updatePO(po.id!, formData);
        poId = updatedPO.id;
      } else {
        // Crear nuevo PO
        const newPO = await createPO(formData);
        poId = newPO.id;
      }

      onSuccess();
    } catch (error) {
      console.error('Error guardando PO:', error);
      alert('Error al guardar el PO');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLinea = async (lineaData: LineaFormData) => {
    try {
      const processedData = {
        po_id: po?.id!,
        reference: lineaData.reference || null,
        style: lineaData.style,
        color: lineaData.color,
        size_run: lineaData.size_run || null,
        qty: parseInt(lineaData.qty) || 0,
        category: lineaData.category || null,
        price: lineaData.price ? parseFloat(lineaData.price) : null,
        amount: lineaData.amount ? parseFloat(lineaData.amount) : null,
        pi_bsg: lineaData.pi_bsg || null,
        price_selling: lineaData.price_selling ? parseFloat(lineaData.price_selling) : null,
        amount_selling: lineaData.amount_selling ? parseFloat(lineaData.amount_selling) : null,
        trial_upper: lineaData.trial_upper || null,
        trial_lasting: lineaData.trial_lasting || null,
        lasting: lineaData.lasting || null,
        finish_date: lineaData.finish_date || null,
      };

      if (lineaData.id) {
        // Actualizar línea existente
        await updateLineaPedido(lineaData.id, processedData);
      } else {
        // Crear nueva línea
        await createLineaPedido(processedData);
      }

      await loadLineas();
      setShowLineaDialog(false);
      setEditingLinea(null);
    } catch (error) {
      console.error('Error guardando línea:', error);
      alert('Error al guardar la línea');
    }
  };

  const handleEditLinea = (linea: LineaPedido) => {
    setEditingLinea({
      id: linea.id,
      reference: linea.reference || '',
      style: linea.style,
      color: linea.color,
      size_run: linea.size_run || '',
      qty: linea.qty.toString(),
      category: linea.category || '',
      price: linea.price?.toString() || '',
      amount: linea.amount?.toString() || '',
      pi_bsg: linea.pi_bsg || '',
      price_selling: linea.price_selling?.toString() || '',
      amount_selling: linea.amount_selling?.toString() || '',
      trial_upper: linea.trial_upper || '',
      trial_lasting: linea.trial_lasting || '',
      lasting: linea.lasting || '',
      finish_date: linea.finish_date || '',
    });
    setShowLineaDialog(true);
  };

  const handleDeleteLinea = async (lineaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta línea?')) return;

    try {
      await deleteLineaPedido(lineaId);
      await loadLineas();
    } catch (error) {
      console.error('Error eliminando línea:', error);
      alert('Error al eliminar la línea');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{po ? 'Editar PO' : 'Nuevo PO'}</CardTitle>
          <CardDescription>
            {po ? 'Modifica los datos del Purchase Order' : 'Ingresa los datos para un nuevo Purchase Order'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po">PO *</Label>
                <Input
                  id="po"
                  value={formData.po}
                  onChange={(e) => handleChange('po', e.target.value)}
                  required
                  disabled={!!po} // No permitir editar PO en existentes
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="season">Season *</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => handleChange('season', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => handleChange('customer', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="factory">Factory *</Label>
                <Input
                  id="factory"
                  value={formData.factory}
                  onChange={(e) => handleChange('factory', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="po_date">PO Date</Label>
                <Input
                  id="po_date"
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => handleChange('po_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="etd_pi">ETD PI</Label>
                <Input
                  id="etd_pi"
                  type="date"
                  value={formData.etd_pi}
                  onChange={(e) => handleChange('etd_pi', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pi">PI</Label>
                <Input
                  id="pi"
                  value={formData.pi}
                  onChange={(e) => handleChange('pi', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="channel">Channel</Label>
                <Input
                  id="channel"
                  value={formData.channel}
                  onChange={(e) => handleChange('channel', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="booking">Booking</Label>
                <Input
                  id="booking"
                  value={formData.booking}
                  onChange={(e) => handleChange('booking', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="closing">Closing</Label>
                <Input
                  id="closing"
                  value={formData.closing}
                  onChange={(e) => handleChange('closing', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="shipping_date">Shipping Date</Label>
                <Input
                  id="shipping_date"
                  type="date"
                  value={formData.shipping_date}
                  onChange={(e) => handleChange('shipping_date', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : po ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {po && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Líneas del Pedido</CardTitle>
                <CardDescription>
                  Gestiona los modelos y cantidades para este PO
                </CardDescription>
              </div>
              <Dialog open={showLineaDialog} onOpenChange={setShowLineaDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingLinea(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Línea
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLinea ? 'Editar Línea' : 'Nueva Línea'}
                    </DialogTitle>
                    <DialogDescription>
                      Ingresa los detalles de la línea de pedido
                    </DialogDescription>
                  </DialogHeader>
                  <LineaForm
                    initialData={editingLinea}
                    onSave={handleSaveLinea}
                    onCancel={() => {
                      setShowLineaDialog(false);
                      setEditingLinea(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {lineas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay líneas registradas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size Run</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((linea) => (
                    <TableRow key={linea.id}>
                      <TableCell className="font-medium">{linea.style}</TableCell>
                      <TableCell>{linea.color}</TableCell>
                      <TableCell>{linea.size_run || '-'}</TableCell>
                      <TableCell>{linea.qty}</TableCell>
                      <TableCell>{linea.price || '-'}</TableCell>
                      <TableCell>{linea.amount || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLinea(linea)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLinea(linea.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface LineaFormProps {
  initialData?: LineaFormData | null;
  onSave: (data: LineaFormData) => void;
  onCancel: () => void;
}

function LineaForm({ initialData, onSave, onCancel }: LineaFormProps) {
  const [formData, setFormData] = useState<LineaFormData>({
    id: initialData?.id || '',
    reference: initialData?.reference || '',
    style: initialData?.style || '',
    color: initialData?.color || '',
    size_run: initialData?.size_run || '',
    qty: initialData?.qty || '',
    category: initialData?.category || '',
    price: initialData?.price || '',
    amount: initialData?.amount || '',
    pi_bsg: initialData?.pi_bsg || '',
    price_selling: initialData?.price_selling || '',
    amount_selling: initialData?.amount_selling || '',
    trial_upper: initialData?.trial_upper || '',
    trial_lasting: initialData?.trial_lasting || '',
    lasting: initialData?.lasting || '',
    finish_date: initialData?.finish_date || '',
  });

  const handleChange = (field: keyof LineaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="style">Style *</Label>
          <Input
            id="style"
            value={formData.style}
            onChange={(e) => handleChange('style', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="color">Color *</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => handleChange('reference', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="size_run">Size Run</Label>
          <Input
            id="size_run"
            value={formData.size_run}
            onChange={(e) => handleChange('size_run', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="qty">Quantity *</Label>
          <Input
            id="qty"
            type="number"
            value={formData.qty}
            onChange={(e) => handleChange('qty', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="finish_date">Finish Date</Label>
          <Input
            id="finish_date"
            type="date"
            value={formData.finish_date}
            onChange={(e) => handleChange('finish_date', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="trial_upper">Trial Upper</Label>
          <Input
            id="trial_upper"
            value={formData.trial_upper}
            onChange={(e) => handleChange('trial_upper', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="trial_lasting">Trial Lasting</Label>
          <Input
            id="trial_lasting"
            value={formData.trial_lasting}
            onChange={(e) => handleChange('trial_lasting', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lasting">Lasting</Label>
          <Input
            id="lasting"
            value={formData.lasting}
            onChange={(e) => handleChange('lasting', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initialData ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}