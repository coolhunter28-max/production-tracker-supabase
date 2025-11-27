import { normalizeRow, groupRowsByPO } from '@/lib/csv-utils';

/**
 * Importa los datos CSV a Supabase a través de la API Route.
 * Antes de enviar, normaliza los datos para garantizar
 * que las fechas y números están en formato ISO y numérico.
 */
export async function importCsvToSupabase(rawRows: any[], fileName: string) {
  try {
    // 🧩 Paso 1: normalizar todas las filas del CSV
    console.log('🔧 Normalizando datos CSV antes de enviar a API...');
    const normalized = rawRows.map((row) => normalizeRow(row));

    // 🧩 Paso 2: agrupar por número de PO
    const groupedPOs = groupRowsByPO(normalized);

    // 🧩 Paso 3: enviar al backend (API route /api/import-csv)
    console.log(`📤 Enviando ${groupedPOs.length} pedidos a Supabase...`);
    const res = await fetch('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupedPOs, fileName }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('❌ Error en API import-csv:', error);
      throw new Error(error.message || 'Error en la importación');
    }

    const data = await res.json();
    console.log('✅ Respuesta del servidor:', data);
    return data.results;
  } catch (err: any) {
    console.error('❌ Error general en importCsvToSupabase:', err);
    throw err;
  }
}
