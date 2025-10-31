/**
 * import-csv-to-supabase.ts
 * -----------------------------------------
 * Envía los pedidos agrupados (ya validados) al backend `/api/import-csv`
 * para insertarlos o actualizarlos en Supabase.
 * -----------------------------------------
 */

export async function importCsvToSupabase(groupedPOs: any[], fileName: string) {
  if (!groupedPOs || groupedPOs.length === 0) {
    throw new Error('No hay pedidos válidos para importar.');
  }

  try {
    console.log(`📤 Enviando ${groupedPOs.length} pedidos a Supabase (archivo: ${fileName})...`);

    const res = await fetch('/api/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupedPOs, fileName }),
    });

    // Intentar leer siempre el cuerpo de la respuesta
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = { message: 'Respuesta del servidor no válida o vacía.' };
    }

    // Manejo de errores HTTP
    if (!res.ok) {
      console.error('❌ Error en la API /api/import-csv:', data);
      throw new Error(data.message || `Error ${res.status} al importar los datos.`);
    }

    console.log('✅ Importación completada correctamente.');
    console.log('📦 Resumen del servidor:', data);
    return data; // Devuelve el resultado de la API (summary, results, etc.)
  } catch (err: any) {
    console.error('❌ Error general en importCsvToSupabase:', err);
    throw new Error(`Error al importar a Supabase: ${err.message}`);
  }
}
