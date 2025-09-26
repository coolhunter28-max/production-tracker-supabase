'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Package, TrendingUp, Users, FileText, Upload, Download, Eye, Edit, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

export function DashboardContent() {
  // Reemplaza los datos estáticos con estados
  const [stats, setStats] = useState({
    totalPedidos: 0,
    enProduccion: 0,
    pendientes: 0,
    completados: 0
  })
  
  const [pedidosRecientes, setPedidosRecientes] = useState<any[]>([])
  const [importacionesRecientes, setImportacionesRecientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Cargar datos desde Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        // Obtener estadísticas
        const { count: totalPedidos } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
        
        const { count: enProduccion } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'en_produccion')
        
        const { count: pendientes } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
        
        const { count: completados } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'completado')
        
        setStats({
          totalPedidos: totalPedidos || 0,
          enProduccion: enProduccion || 0,
          pendientes: pendientes || 0,
          completados: completados || 0
        })
        
        // Obtener pedidos recientes
        const { data: pedidos } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        
        setPedidosRecientes(pedidos || [])
        
        // Obtener importaciones recientes
        const { data: importaciones } = await supabase
          .from('importaciones')
          .select('*')
          .order('fecha_importacion', { ascending: false })
          .limit(5)
        
        setImportacionesRecientes(importaciones || [])
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    
    // Suscribirse a cambios en tiempo real
    const pedidosChannel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => fetchData()
      )
      .subscribe()
    
    const importacionesChannel = supabase
      .channel('importaciones-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'importaciones' },
        () => fetchData()
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(pedidosChannel)
      supabase.removeChannel(importacionesChannel)
    }
  }, [])
  
  const getStatusColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'en_produccion': return 'bg-blue-100 text-blue-800'
      case 'completado': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusText = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente'
      case 'en_produccion': return 'En Producción'
      case 'completado': return 'Completado'
      default: return estado
    }
  }
  
  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'pedido': return <Package className="h-4 w-4" />
      case 'importacion': return <Upload className="h-4 w-4" />
      case 'edicion': return <Edit className="h-4 w-4" />
      case 'completado': return <FileText className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }
  
  // Generar actividades recientes a partir de los datos
  const actividadesRecientes = [
    ...pedidosRecientes.slice(0, 3).map(pedido => ({
      id: `ped-${pedido.id}`,
      tipo: 'pedido',
      descripcion: `Pedido ${pedido.id} creado`,
      usuario: 'Sistema',
      fecha: new Date(pedido.created_at).toLocaleString()
    })),
    ...importacionesRecientes.slice(0, 2).map(imp => ({
      id: `imp-${imp.id}`,
      tipo: 'importacion',
      descripcion: `Importación ${imp.nombre_archivo} completada`,
      usuario: 'Sistema',
      fecha: new Date(imp.fecha_importacion).toLocaleString()
    }))
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Tracker</h1>
          <p className="text-muted-foreground">
            Sistema de seguimiento de producción y gestión de pedidos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/pedidos">
            <Button className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ver Pedidos
            </Button>
          </Link>
          <Link href="/import">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Datos
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalPedidos}</div>
            <p className="text-xs text-muted-foreground">Pedidos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Producción</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.enProduccion}</div>
            <p className="text-xs text-muted-foreground">Activos actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Por iniciar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.completados}</div>
            <p className="text-xs text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos Recientes</TabsTrigger>
          <TabsTrigger value="activity">Actividad Reciente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Accesos directos a las funciones más utilizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/pedidos-simple">
                  <Button className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Nuevo Pedido
                  </Button>
                </Link>
                <Link href="/pedidos">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Gestionar Pedidos
                  </Button>
                </Link>
                <Link href="/import">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Datos
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Reporte
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estado del Sistema</CardTitle>
                <CardDescription>
                  Información general del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Estado del Servidor</span>
                  <Badge className="bg-green-100 text-green-800">En línea</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Última Sincronización</span>
                  <span className="text-sm text-muted-foreground">Ahora</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Base de Datos</span>
                  <Badge className="bg-green-100 text-green-800">Conectada</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Importaciones</span>
                  <span className="text-sm text-muted-foreground">{importacionesRecientes.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
              <CardDescription>
                Últimos pedidos registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estilo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Cargando datos...
                        </TableCell>
                      </TableRow>
                    ) : pedidosRecientes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No hay pedidos recientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      pedidosRecientes.map((pedido) => (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">{pedido.id}</TableCell>
                          <TableCell>{pedido.cliente}</TableCell>
                          <TableCell>{pedido.estilo}</TableCell>
                          <TableCell>{pedido.cantidad}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(pedido.estado)}>
                              {getStatusText(pedido.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(pedido.fecha_entrega).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link href={`/pedidos/view/${pedido.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/pedidos/edit/${pedido.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas actividades realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center py-4">Cargando actividades...</p>
                ) : actividadesRecientes.length === 0 ? (
                  <p className="text-center py-4">No hay actividades recientes</p>
                ) : (
                  actividadesRecientes.map((actividad) => (
                    <div key={actividad.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(actividad.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{actividad.descripcion}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span>{actividad.usuario}</span>
                          <span className="mx-2">•</span>
                          <span>{actividad.fecha}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}