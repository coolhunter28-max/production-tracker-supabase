'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function MigrateManualPage() {
  const [status, setStatus] = useState('Listo para migrar')
  
  const handleMigrate = async () => {
    try {
      setStatus('Migrando...')
      
      // Obtener datos de localStorage
      const localPedidos = JSON.parse(localStorage.getItem('integratedPedidos') || '[]')
      
      if (localPedidos.length === 0) {
        setStatus('No hay pedidos para migrar')
        return
      }
      
      // Transformar datos para Supabase
      const pedidosToInsert = localPedidos.map(p => ({
        cliente: p.cliente || '',
        estilo: p.estilo || '',
        last: p.last || '',
        outsole: p.outsole || '',
        cantidad: p.cantidad || 0,
        fecha_entrega: p.fechaEntrega || new Date().toISOString().split('T')[0],
        estado: p.estado || 'pendiente',
        prioridad: p.prioridad || 'media',
        notas: p.notas || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      // Insertar en Supabase
      const { data, error } = await supabase
        .from('pedidos')
        .insert(pedidosToInsert)
      
      if (error) {
        throw error
      }
      
      setStatus(`Migración completada. ${localPedidos.length} pedidos migrados.`)
    } catch (error: any) {
      setStatus(`Error: ${error.message}`)
    }
  }
  
  const handleCreateTestData = () => {
    const pedidosPrueba = [
      {
        id: 'PED-001',
        cliente: 'BSG_Arigato Marathon',
        estilo: 'MOD 1',
        last: 'DK124-1075',
        outsole: 'DIC-8941',
        cantidad: 1000,
        fechaEntrega: '2024-06-15',
        estado: 'pendiente',
        prioridad: 'alta',
        notas: 'Importado desde Excel'
      },
      {
        id: 'PED-002',
        cliente: 'BSG_Balmain',
        estilo: 'MOD 2',
        last: 'DK125-1076',
        outsole: 'DIC-8942',
        cantidad: 750,
        fechaEntrega: '2024-06-20',
        estado: 'en_produccion',
        prioridad: 'media',
        notas: 'Otro pedido de prueba'
      }
    ]
    
    localStorage.setItem('integratedPedidos', JSON.stringify(pedidosPrueba))
    setStatus('Datos de prueba creados. Ahora puedes migrarlos.')
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Migración Manual de Pedidos</h1>
        <p className="mb-4">
          Esta herramienta migrará los pedidos almacenados en localStorage 
          a la base de datos de Supabase.
        </p>
        
        <div className="mb-4 p-3 bg-gray-100 rounded">
          {status}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleMigrate}
            className="w-full"
          >
            Migrar Pedidos
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleCreateTestData}
            className="w-full"
          >
            Crear Datos de Prueba
          </Button>
        </div>
      </div>
    </div>
  )
}