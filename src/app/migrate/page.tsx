'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function MigratePage() {
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  
  const handleMigrate = async () => {
    setMigrating(true)
    setResult(null)
    
    try {
      // Migrar pedidos
      const localPedidos = JSON.parse(localStorage.getItem('integratedPedidos') || '[]')
      
      if (localPedidos.length > 0) {
        const { error } = await supabase
          .from('pedidos')
          .insert(localPedidos.map(p => ({
            ...p,
            fecha_entrega: p.fechaEntrega,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })))
        
        if (error) throw error
        console.log(`${localPedidos.length} pedidos migrados exitosamente`)
      }
      
      // Migrar historial de importaciones
      const importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]')
      
      if (importHistory.length > 0) {
        const { error } = await supabase
          .from('importaciones')
          .insert(importHistory.map(imp => ({
            nombre_archivo: imp.fileName,
            fecha_importacion: imp.timestamp,
            cantidad_registros: imp.recordCount,
            estado: 'completado',
            datos: imp.data
          })))
        
        if (error) throw error
        console.log(`${importHistory.length} importaciones migradas exitosamente`)
      }
      
      setResult({
        success: true,
        message: 'Migración completada exitosamente'
      })
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error en la migración: ${error.message}`
      })
    } finally {
      setMigrating(false)
    }
  }
  
  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Migración de Datos</CardTitle>
          <CardDescription>
            Migrar datos existentes de localStorage a Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Esta herramienta migrará los pedidos y el historial de importaciones 
            almacenados en localStorage a la base de datos de Supabase.
          </p>
          
          {result && (
            <Alert className={result.success ? "border-green-500" : "border-red-500"}>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleMigrate} 
            disabled={migrating}
            className="w-full"
          >
            {migrating ? 'Migrando datos...' : 'Iniciar Migración'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}