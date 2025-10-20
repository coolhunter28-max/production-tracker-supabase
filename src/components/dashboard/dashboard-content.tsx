'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity, Package, TrendingUp, Users, FileText,
  Upload, Download, Eye, Edit, Plus
} from 'lucide-react'
import Link from 'next/link'

export function DashboardContent() {
  const [stats, setStats] = useState({
    totalPedidos: 0,
    enProduccion: 0,
    pendientes: 0,
    completados: 0,
  })

  const [pedidosRecientes, setPedidosRecientes] = useState<any[]>([])
  const [importacionesRecientes, setImportacionesRecientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
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
          completados: completados || 0,
        })

        const { data: pedidos } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        setPedidosRecientes(pedidos || [])

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

  // ✅ Tipado explícito de los parámetros
  const getStatusColor = (estado: string): string => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'en_produccion':
        return 'bg-blue-100 text-blue-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (estado: string): string => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente'
      case 'en_produccion':
        return 'En Producción'
      case 'completado':
        return 'Completado'
      default:
        return estado
    }
  }

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'pedido':
        return <Package className="h-4 w-4" />
      case 'importacion':
        return <Upload className="h-4 w-4" />
      case 'edicion':
        return <Edit className="h-4 w-4" />
      case 'completado':
        return <FileText className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const actividadesRecientes = [
    ...pedidosRecientes.slice(0, 3).map((pedido) => ({
      id: `ped-${pedido.id}`,
      tipo: 'pedido',
      descripcion: `Pedido ${pedido.id} creado`,
      usuario: 'Sistema',
      fecha: new Date(pedido.created_at).toLocaleString(),
    })),
    ...importacionesRecientes.slice(0, 2).map((imp) => ({
      id: `imp-${imp.id}`,
      tipo: 'importacion',
      descripcion: `Importación ${imp.nombre_archivo} completada`,
      usuario: 'Sistema',
      fecha: new Date(imp.fecha_importacion).toLocaleString(),
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Encabezado principal */}
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

      {/* Tabs */}
      {/* (resto de tu código igual, sin cambios) */}
    </div>
  )
}
