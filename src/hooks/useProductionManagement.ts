// src/hooks/useProductionManagement.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase, handleSupabaseError } from '../services/supabase'
import { ProductionOrder, ProductionStage, QualityCheck } from '../types/production'

interface UseProductionManagementReturn {
  orders: ProductionOrder[]
  stages: ProductionStage[]
  loading: boolean
  error: string | null
  createOrder: (order: Omit<ProductionOrder, 'id' | 'created_at'>) => Promise<void>
  updateOrderStatus: (orderId: string, status: ProductionOrder['status']) => Promise<void>
  createQualityCheck: (check: Omit<QualityCheck, 'id' | 'created_at'>) => Promise<void>
  getOrdersByStatus: (status: ProductionOrder['status']) => ProductionOrder[]
  refreshData: () => Promise<void>
}

export const useProductionManagement = (): UseProductionManagementReturn => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [stages, setStages] = useState<ProductionStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar órdenes de producción
  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          quality_checks (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      setError(handleSupabaseError(err).message)
    }
  }, [])

  // Cargar etapas de producción
  const fetchStages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('production_stages')
        .select('*')
        .order('order', { ascending: true })

      if (error) throw error
      setStages(data || [])
    } catch (err) {
      setError(handleSupabaseError(err).message)
    }
  }, [])

  // Crear nueva orden
  const createOrder = useCallback(async (orderData: Omit<ProductionOrder, 'id' | 'created_at'>) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('production_orders')
        .insert([orderData])
        .select()
        .single()

      if (error) throw error

      setOrders(prev => [data, ...prev])
    } catch (err) {
      throw handleSupabaseError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Actualizar estado de orden
  const updateOrderStatus = useCallback(async (orderId: string, status: ProductionOrder['status']) => {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updated_at: new Date().toISOString() }
          : order
      ))
    } catch (err) {
      throw handleSupabaseError(err)
    }
  }, [])

  // Crear control de calidad
  const createQualityCheck = useCallback(async (checkData: Omit<QualityCheck, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('quality_checks')
        .insert([checkData])
        .select()
        .single()

      if (error) throw error

      // Actualizar la orden correspondiente
      await refreshData()
    } catch (err) {
      throw handleSupabaseError(err)
    }
  }, [])

  // Filtrar órdenes por estado
  const getOrdersByStatus = useCallback((status: ProductionOrder['status']) => {
    return orders.filter(order => order.status === status)
  }, [orders])

  // Refrescar todos los datos
  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([fetchOrders(), fetchStages()])
    } catch (err) {
      setError(handleSupabaseError(err).message)
    } finally {
      setLoading(false)
    }
  }, [fetchOrders, fetchStages])

  // Cargar datos inicial
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    const ordersChannel = supabase
      .channel('production_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_orders'
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [fetchOrders])

  return {
    orders,
    stages,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    createQualityCheck,
    getOrdersByStatus,
    refreshData
  }
}