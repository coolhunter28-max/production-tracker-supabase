'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, FileText, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

export function ImportContent() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [importStatus, setImportStatus] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Cargar historial de importaciones
  useEffect(() => {
    const fetchImportHistory = async () => {
      const { data, error } = await supabase
        .from('importaciones')
        .select('*')
        .order('fecha_importacion', { ascending: false })
      
      if (error) {
        console.error('Error al cargar historial:', error)
      } else {
        setImportHistory(data || [])
      }
    }
    
    fetchImportHistory()
  }, [])
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportStatus(null)
      
      // Generar vista previa
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          // Limitar vista previa a 10 registros
          setPreviewData(jsonData.slice(0, 10))
        } catch (error) {
          console.error('Error al procesar archivo:', error)
          setImportStatus({
            success: false,
            message: 'Error al procesar el archivo. Asegúrate de que es un archivo Excel válido.'
          })
        }
      }
      reader.readAsArrayBuffer(selectedFile)
    }
  }
  
  const handleImport = async () => {
    if (!file) return
    
    setImporting(true)
    setImportStatus(null)
    
    try {
      // Leer archivo completo
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          // Transformar datos al formato esperado
          const pedidosToImport = jsonData.map((row: any, index) => ({
            cliente: row.Cliente || row.cliente || '',
            estilo: row.Estilo || row.estilo || '',
            last: row.Last || row.last || '',
            outsole: row.Outsole || row.outsole || '',
            cantidad: parseInt(row.Cantidad || row.cantidad || 0),
            fecha_entrega: row['Fecha Entrega'] || row.fechaEntrega || new Date().toISOString().split('T')[0],
            estado: row.Estado || row.estado || 'pendiente',
            prioridad: row.Prioridad || row.prioridad || 'media',
            notas: row.Notas || row.notas || `Importado desde Excel - Registro ${index + 1}`
          }))
          
          // Registrar importación
          const { data: importRecord, error: importError } = await supabase
            .from('importaciones')
            .insert([{
              nombre_archivo: file.name,
              cantidad_registros: pedidosToImport.length,
              estado: 'procesando',
              datos: jsonData
            }])
            .select()
          
          if (importError) throw importError
          
          // Insertar pedidos
          const { error: insertError } = await supabase
            .from('pedidos')
            .insert(pedidosToImport)
          
          if (insertError) throw insertError
          
          // Actualizar estado de importación
          await supabase
            .from('importaciones')
            .update({ estado: 'completado' })
            .eq('id', importRecord[0].id)
          
          setImportStatus({
            success: true,
            message: `Importación completada exitosamente. ${pedidosToImport.length} pedidos importados.`,
            details: {
              fileName: file.name,
              recordCount: pedidosToImport.length
            }
          })
          
          // Actualizar historial
          setImportHistory(prev => [
            {
              id: importRecord[0].id,
              nombre_archivo: file.name,
              fecha_importacion: new Date().toISOString(),
              cantidad_registros: pedidosToImport.length,
              estado: 'completado'
            },
            ...prev
          ])
          
          // Limpiar formulario
          setFile(null)
          setPreviewData([])
          if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (error) {
          console.error('Error durante importación:', error)
          setImportStatus({
            success: false,
            message: 'Error durante la importación. Por favor, intenta nuevamente.',
            details: error
          })
        } finally {
          setImporting(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error al leer archivo:', error)
      setImportStatus({
        success: false,
        message: 'Error al leer el archivo. Por favor, intenta nuevamente.'
      })
      setImporting(false)
    }
  }
  
  const downloadTemplate = () => {
    // Crear plantilla de Excel
    const templateData = [
      {
        Cliente: 'Cliente Ejemplo',
        Estilo: 'Estilo Ejemplo',
        Last: 'Last Ejemplo',
        Outsole: 'Outsole Ejemplo',
        Cantidad: 100,
        'Fecha Entrega': '2024-12-31',
        Estado: 'pendiente',
        Prioridad: 'media',
        Notas: 'Notas de ejemplo'
      }
    ]
    
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla')
    
    XLSX.writeFile(workbook, 'plantilla_pedidos.xlsx')
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Importación de Datos</h1>
        <p className="text-gray-600">Importa pedidos desde archivos Excel o CSV</p>
      </div>
      
      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Importar Datos</TabsTrigger>
          <TabsTrigger value="history">Historial de Importaciones</TabsTrigger>
          <TabsTrigger value="template">Plantilla</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Archivo</CardTitle>
              <CardDescription>
                Selecciona un archivo Excel o CSV con los datos de los pedidos a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="mb-4"
                />
                
                {file && (
                  <div className="mb-4">
                    <p>Archivo seleccionado: <strong>{file.name}</strong></p>
                    <p>Tamaño: <strong>{(file.size / 1024).toFixed(2)} KB</strong></p>
                  </div>
                )}
                
                {previewData.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Vista Previa (primeros 10 registros)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(previewData[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value: any, i) => (
                                <TableCell key={i}>{String(value)}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {importStatus && (
                  <Alert className={importStatus.success ? "border-green-500" : "border-red-500"}>
                    <AlertDescription>{importStatus.message}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleImport} 
                    disabled={!file || importing}
                  >
                    {importing ? 'Importando...' : 'Importar Datos'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setFile(null)
                    setPreviewData([])
                    setImportStatus(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Importaciones</CardTitle>
              <CardDescription>
                Registro de todas las importaciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importHistory.length === 0 ? (
                <p className="text-gray-500">No hay importaciones registradas</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell>{imp.nombre_archivo}</TableCell>
                          <TableCell>{new Date(imp.fecha_importacion).toLocaleString()}</TableCell>
                          <TableCell>{imp.cantidad_registros}</TableCell>
                          <TableCell>
                            <Badge variant={imp.estado === 'completado' ? 'default' : 'secondary'}>
                              {imp.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="template" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantilla de Importación</CardTitle>
              <CardDescription>
                Descarga la plantilla de Excel para asegurarte de que tus datos tengan el formato correcto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                La plantilla contiene las columnas necesarias para importar pedidos al sistema:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Cliente</li>
                <li>Estilo</li>
                <li>Last</li>
                <li>Outsole</li>
                <li>Cantidad</li>
                <li>Fecha Entrega</li>
                <li>Estado</li>
                <li>Prioridad</li>
                <li>Notas</li>
              </ul>
              <Button onClick={downloadTemplate}>
                Descargar Plantilla
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}