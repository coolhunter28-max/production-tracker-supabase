// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

// ✅ Importación opcional de tipos: solo si existen
// Si no tienes src/types/supabase.ts generado, este import no romperá el build
// @ts-ignore
import type { Database } from '../types/supabase'

// 🔹 Variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY // o ANON_KEY según tu proyecto

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Faltan variables de entorno de Supabase')
}

// 🔹 Crear cliente de Supabase (con o sin tipos)
export const supabase = createClient<Database extends object ? Database : any>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application': 'calzado-production-manager',
      },
    },
  }
)

// 🔹 Tipado y manejo robusto de errores Supabase
interface SupabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export const handleSupabaseError = (error: SupabaseError | unknown) => {
  console.error('❌ Supabase error:', error)

  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as SupabaseError

    switch (err.code) {
      case 'PGRST116':
        throw new Error('No se encontraron registros.')
      case '23505':
        throw new Error('Ya existe un registro con estos datos.')
      default:
        if (err.message?.includes('JWT')) {
          throw new Error('Sesión expirada. Inicia sesión nuevamente.')
        }
        throw new Error(err.message || 'Error desconocido en Supabase.')
    }
  }

  if (error instanceof Error) {
    throw new Error(error.message)
  }

  throw new Error('Error desconocido.')
}
