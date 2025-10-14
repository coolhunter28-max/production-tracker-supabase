// src/lib/supabase.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente por defecto (para usar directamente en el frontend)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// 🧩 Función para crear cliente nuevo (por ejemplo, en rutas API)
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
