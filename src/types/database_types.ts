// src/types/database.ts
// Tipos TypeScript basados en tu esquema actual de Supabase

export interface Database {
  public: {
    Tables: {
      // Tabla de usuarios/profiles
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          avatar_url: string | null
          company_id: string | null
          role: 'admin' | 'manager' | 'operator' | 'inspector' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          avatar_url?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'operator' | 'inspector' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          avatar_url?: string | null
          company_id?: string | null
          role?: 'admin' | 'manager' | 'operator' | 'inspector' | null
          updated_at?: string
        }
      }

      // Tabla de órdenes de producción (adaptada a calzado)
      production_orders: {
        Row: {
          id: string
          order_number: string
          model_name: string
          customer_name: string | null
          quantity_total: number
          size_distribution: Json | null // {"35": 2, "36": 4, "37": 6, etc.}
          color: string | null
          material_type: string | null
          status: 'pending' | 'in_progress' | 'quality_check' | 'completed' | 'on_hold' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          start_date: string | null
          completion_date: string | null
          created_by: string
          company_id: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          model_name: string
          customer_name?: string | null
          quantity_total: number
          size_distribution?: Json | null
          color?: string | null
          material_type?: string | null
          status?: 'pending' | 'in_progress' | 'quality_check' | 'completed' | 'on_hold' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          start_date?: string | null
          completion_date?: string | null
          created_by: string
          company_id: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          order_number?: string
          model_name?: string
          customer_name?: string | null
          quantity_total?: number
          size_distribution?: Json | null
          color?: string | null
          material_type?: string | null
          status?: 'pending' | 'in_progress' | 'quality_check' | 'completed' | 'on_hold' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          start_date?: string | null
          completion_date?: string | null
          notes?: string | null
          updated_at?: string
        }
      }

      // Tabla de etapas de producción
      production_stages: {
        Row: {
          id: string
          order_id: string
          stage_name: string
          stage_order: number
          estimated_duration: number // minutos
          actual_duration: number | null
          assigned_to: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'skipped'
          started_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          stage_name: string
          stage_order: number
          estimated_duration: number
          actual_duration?: number | null
          assigned_to?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          stage_name?: string
          stage_order?: number
          estimated_duration?: number
          actual_duration?: number | null
          assigned_to?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          updated_at?: string
        }
      }

      // Tabla de controles de calidad
      quality_checks: {
        Row: {
          id: string
          order_id: string
          stage_id: string | null
          inspector_id: string
          checkpoints: Json // Array de objetos con criterios de calidad
          overall_passed: boolean
          defect_count: number
          defect_details: Json | null
          images: string[] | null
          inspector_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          stage_id?: string | null
          inspector_id: string
          checkpoints: Json
          overall_passed: boolean
          defect_count?: number
          defect_details?: Json | null
          images?: string[] | null
          inspector_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          checkpoints?: Json
          overall_passed?: boolean
          defect_count?: number
          defect_details?: Json | null
          images?: string[] | null
          inspector_notes?: string | null
          updated_at?: string
        }
      }

      // Tabla de inventario de materiales
      materials_inventory: {
        Row: {
          id: string
          material_name: string
          material_type: 'leather' | 'synthetic' | 'fabric' | 'sole' | 'hardware' | 'adhesive' | 'other'
          supplier: string | null
          color: string | null
          size_specs: string | null
          unit_of_measure: 'meters' | 'pieces' | 'kilograms' | 'liters' | 'pairs'
          stock_quantity: number
          min_stock_level: number
          unit_cost: number
          last_purchase_date: string | null
          expiry_date: string | null
          location: string | null
          company_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_name: string
          material_type: 'leather' | 'synthetic' | 'fabric' | 'sole' | 'hardware' | 'adhesive' | 'other'
          supplier?: string | null
          color?: string | null
          size_specs?: string | null
          unit_of_measure: 'meters' | 'pieces' | 'kilograms' | 'liters' | 'pairs'
          stock_quantity: number
          min_stock_level: number
          unit_cost: number
          last_purchase_date?: string | null
          expiry_date?: string | null
          location?: string | null
          company_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          material_name?: string
          material_type?: 'leather' | 'synthetic' | 'fabric' | 'sole' | 'hardware' | 'adhesive' | 'other'
          supplier?: string | null
          color?: string | null
          size_specs?: string | null
          unit_of_measure?: 'meters' | 'pieces' | 'kilograms' | 'liters' | 'pairs'
          stock_quantity?: number
          min_stock_level?: number
          unit_cost?: number
          last_purchase_date?: string | null
          expiry_date?: string | null
          location?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares para uso en componentes
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProductionOrder = Database['public']['Tables']['production_orders']['Row']
export type ProductionStage = Database['public']['Tables']['production_stages']['Row']
export type QualityCheck = Database['public']['Tables']['quality_checks']['Row']
export type MaterialInventory = Database['public']['Tables']['materials_inventory']['Row']

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Tipos específicos para el negocio del calzado
export interface SizeDistribution {
  [size: string]: number // "35": 2, "36": 4, etc.
}

export interface QualityCheckpoint {
  id: string
  name: string
  description: string
  passed: boolean
  severity: 'low' | 'medium' | 'high'
  notes?: string
}

export interface MaterialRequirement {
  material_id: string
  quantity_needed: number
  unit: string
  notes?: string
}

export interface DefectDetail {
  defect_type: string
  severity: 'minor' | 'major' | 'critical'
  location: string
  description: string
  image_url?: string
}