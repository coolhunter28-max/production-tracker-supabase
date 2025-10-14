/**
 * Script de verificación de Supabase (.env.local)
 * Ejecuta:  npx tsx scripts/test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('🧠 Verificando configuración de Supabase...\n')

  if (!url || !anon || !service) {
    console.error('❌ Faltan claves en .env.local')
    console.error({
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anon,
      SUPABASE_SERVICE_ROLE_KEY: !!service,
    })
    process.exit(1)
  }

  const anonClient = createClient(url, anon)
  const serviceClient = createClient(url, service)

  try {
    console.log('🔹 Verificando acceso con clave ANON...')
    const { data: anonData, error: anonError } = await anonClient.from('alertas').select('*').limit(1)
    if (anonError) throw anonError
    console.log('✅ ANON OK: lectura básica permitida')

    console.log('🔹 Verificando acceso con clave SERVICE ROLE...')
    const { data: srvData, error: srvError } = await serviceClient.rpc('generar_alertas')
    if (srvError) throw srvError
    console.log('✅ SERVICE ROLE OK: llamada RPC exitosa')

    console.log('\n🎉 Todas las claves funcionan correctamente.')
  } catch (err: any) {
    console.error('\n❌ Error en la verificación:')
    console.error(err.message || err)
  }
}

main()
