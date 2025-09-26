// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Para Next.js usamos process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // Asegúrate que sea PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application': 'calzado-production-manager'
    }
  }
})

// Helper para manejo de errores
interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export const handleSupabaseError = (error: SupabaseError | unknown) => {
  console.error('Supabase error:', error)
  
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as SupabaseError;
    
    if (err.code === 'PGRST116') {
      throw new Error('No se encontraron registros')
    }
    if (err.code === '23505') {
      throw new Error('Ya existe un registro con estos datos')
    }
    if (err.message?.includes('JWT')) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente')
    }
    throw new Error(err.message || 'Error desconocido')
  }
  
  if (error instanceof Error) {
    throw new Error(error.message)
  }
  
  throw new Error('Error desconocido')
}