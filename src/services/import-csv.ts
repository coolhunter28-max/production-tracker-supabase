// src/services/import-csv.ts

/**
 * Stub temporal para importar un CSV.
 * Deberás reemplazar esta lógica con la real (ej: parsear CSV y subir a Supabase).
 */
export async function importCSV(file: File): Promise<{
  message: string;
  count: number;
  successCount: number;
  errorCount: number;
}> {
  console.log("Importando archivo:", file.name);

  // Simulación: espera 1 segundo y responde con datos ficticios
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    message: `Archivo ${file.name} procesado correctamente.`,
    count: 100, // total de registros detectados
    successCount: 95, // registros importados con éxito
    errorCount: 5, // registros con error
  };
}
