'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Download, FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react'

// Datos de ejemplo para el historial de importaciones
const historialImportaciones = [
  {
    id: 1,
    nombre: 'pedidos_junio_2024.xlsx',
    fecha: '2024-06-10 10:30',
    estado: 'completado',
    registros: 150,
    exitosos: 148,
    errores: 2,
    duracion: '2:30'
  },
  {
    id: 2,
    nombre: 'clientes_actualizados.csv',
    fecha: '2024-06-09 15:45',
    estado: 'completado',
    registros: 45,
    exitosos: 45,
    errores: 0,
    duracion: '0:45'
  },
  {
    id: 3,
    nombre: 'produccion_mayo.xlsx',
    fecha: '2024-06-08 09:15',
    estado: 'error',
    registros: 200,
    exitosos: 0,
    errores: 200,
    duracion: '1:15'
  },
  {
    id: 4,
    nombre: 'estilos_nuevos.csv',
    fecha: '2024-06-07 14:20',
    estado: 'procesando',
    registros: 75,
    exitosos: 0,
    errores: 0,
    duracion: '0:30'
  }
]

// Datos de ejemplo para plantillas
const plantillasDisponibles = [
  {
    id: 1,
    nombre: 'Plantilla de Pedidos',
    descripcion: 'Formato estándar para importar pedidos',
    formato: 'Excel (.xlsx)',
    descargas: 245,
    ultimaActualizacion: '2024-06-01'
  },
  {
    id: 2,
    nombre: 'Plantilla de Clientes',
    descripcion: 'Formato para importar datos de clientes',
    formato: 'CSV (.csv)',
    descargas: 128,
    ultimaActualizacion: '2024-05-28'
  },
  {
    id: 3,
    nombre: 'Plantilla de Estilos',
    descripcion: 'Formato para importar catálogo de estilos',
    formato: 'Excel (.xlsx)',
    descargas: 89,
    ultimaActualizacion: '2024-06-05'
  }
]

export default function ImportPage() {
  const [archivo, setArchivo] = useState(null)
  const [progreso, setProgreso] = useState(0)
  const [importando, setImportando] = useState(false)
  const [importacionCompleta, setImportacionCompleta] = useState(false)
  const [historial, setHistorial] = useState(historialImportaciones)
  const [plantillas, setPlantillas] = useState(plantillasDisponibles)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setArchivo(file)
    }
  }

  const handleImport = () => {
    if (!archivo) return

    setImportando(true)
    setProgreso(0)

    // Simular progreso de importación
    const interval = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setImportando(false)
          setImportacionCompleta(true)
          
          // Añadir al historial
          const nuevaImportacion = {
            id: historial.length + 1,
            nombre: archivo.name,
            fecha: new Date().toLocaleString(),
            estado: 'completado',
            registros: Math.floor(Math.random() * 200) + 50,
            exitosos: Math.floor(Math.random() * 190) + 40,
            errores: Math.floor(Math.random() * 10),
            duracion: `${Math.floor(Math.random() * 3) + 1}:${Math.floor(Math.random() * 60)}`
          }
          setHistorial([nuevaImportacion, ...historial])
          
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const handleDownloadPlantilla = (plantilla) => {
    // Simular descarga de plantilla
    alert(`Descargando plantilla: ${plantilla.nombre}`)
    
    // Incrementar contador de descargas
    setPlantillas(prev => prev.map(p => 
      p.id === plantilla.id 
        ? { ...p, descargas: p.descargas + 1 }
        : p
    ))
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'completado':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case 'procesando':
        return <Badge className="bg-blue-100 text-blue-800">Procesando</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>
    }
  }

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'completado':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'procesando':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importación de Datos</h1>
          <p className="text-muted-foreground">
            Importa pedidos, clientes y otros datos desde archivos externos
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/'} className="flex items-center gap-2">
          Volver al Inicio
        </Button>
      </div>

      <Tabs defaultValue="importar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="importar">Importar Archivo</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        
        <TabsContent value="importar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Nuevo Archivo</CardTitle>
              <CardDescription>
                Selecciona un archivo Excel o CSV para importar datos al sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Seleccionar archivo para importar
                    </span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      disabled={importando}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Excel (.xlsx, .xls) o CSV (.csv)
                  </p>
                </div>
              </div>

              {archivo && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Archivo seleccionado: <strong>{archivo.name}</strong> ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                  </AlertDescription>
                </Alert>
              )}

              {importando && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando...</span>
                    <span>{progreso}%</span>
                  </div>
                  <Progress value={progreso} className="w-full" />
                </div>
              )}

              {importacionCompleta && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Importación completada exitosamente. Los datos han sido procesados y añadidos al sistema.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setArchivo(null)} disabled={importando}>
                  Limpiar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={!archivo || importando}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importando ? 'Importando...' : 'Importar Archivo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="plantillas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas Disponibles</CardTitle>
              <CardDescription>
                Descarga plantillas predefinidas para asegurar el formato correcto de tus datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Descargas</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plantillas.map((plantilla) => (
                      <TableRow key={plantilla.id}>
                        <TableCell className="font-medium">{plantilla.nombre}</TableCell>
                        <TableCell>{plantilla.descripcion}</TableCell>
                        <TableCell>{plantilla.formato}</TableCell>
                        <TableCell>{plantilla.descargas}</TableCell>
                        <TableCell>{plantilla.ultimaActualizacion}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPlantilla(plantilla)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Importaciones</CardTitle>
              <CardDescription>
                Registro de todas las importaciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Exitosos</TableHead>
                      <TableHead>Errores</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((importacion) => (
                      <TableRow key={importacion.id}>
                        <TableCell className="font-medium">{importacion.nombre}</TableCell>
                        <TableCell>{importacion.fecha}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEstadoIcon(importacion.estado)}
                            {getEstadoBadge(importacion.estado)}
                          </div>
                        </TableCell>
                        <TableCell>{importacion.registros}</TableCell>
                        <TableCell className="text-green-600">{importacion.exitosos}</TableCell>
                        <TableCell className="text-red-600">{importacion.errores}</TableCell>
                        <TableCell>{importacion.duracion}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
