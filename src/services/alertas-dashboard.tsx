// src/components/alertas/alertas-dashboard.tsx
import React, { useState, useEffect } from 'react';
import { alertasService } from '@/services/alertas';
import { Alerta } from '@/types/alertas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const AlertasDashboard: React.FC = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    try {
      const data = await alertasService.obtenerAlertas();
      setAlertas(data);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarLeida = async (id: string) => {
    try {
      await alertasService.marcarComoLeida(id);
      setAlertas(alertas.map(alerta =>
        alerta.id === id ? { ...alerta, leida: true } : alerta
      ));
    } catch (error) {
      console.error('Error al marcar alerta como leída:', error);
    }
  };

  const alertasFiltradas = alertas.filter(alerta => {
    if (!busqueda) return true;
    return (
      alerta.po.toLowerCase().includes(busqueda.toLowerCase()) ||
      alerta.subtipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      alerta.mensaje.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case 'critica': return 'bg-red-500';
      case 'alta': return 'bg-red-400';
      case 'media': return 'bg-yellow-400';
      case 'baja': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  if (loading) return <div>Cargando alertas...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alertas del Sistema</CardTitle>
          <CardDescription>
            Gestiona y monitorea todas las alertas generadas por el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Buscar alertas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Subtipo</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Días Restantes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertasFiltradas.map((alerta) => (
                <TableRow key={alerta.id} className={alerta.leida ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{alerta.tipo}</TableCell>
                  <TableCell>{alerta.subtipo}</TableCell>
                  <TableCell className="font-medium">{alerta.po}</TableCell>
                  <TableCell>{alerta.mensaje}</TableCell>
                  <TableCell>
                    <Badge className={getSeveridadColor(alerta.severidad)}>
                      {alerta.severidad}
                    </Badge>
                  </TableCell>
                  <TableCell>{alerta.diasRestantes}</TableCell>
                  <TableCell>
                    <Badge variant={alerta.leida ? "outline" : "default"}>
                      {alerta.leida ? 'Leída' : 'No leída'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!alerta.leida && (
                      <Button
                        size="sm"
                        onClick={() => handleMarcarLeida(alerta.id)}
                      >
                        Marcar como leída
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {alertasFiltradas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron alertas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertasDashboard;
