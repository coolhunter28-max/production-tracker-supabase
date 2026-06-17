import { groupRowsByPO } from "@/lib/groupRowsByPO";

export async function importCsvToSupabase(rawRows: any[], fileName: string) {
  try {
    console.log("🔧 Normalizando datos CSV antes de enviar a API...");

    const groupedPOs = groupRowsByPO(rawRows);

    console.log(`📤 Enviando ${groupedPOs.length} pedidos a Supabase...`);

    const res = await fetch("/api/import-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupedPOs, fileName }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("❌ Error en API import-csv:", error);
      throw new Error(error.message || "Error en la importación");
    }

    const data = await res.json();
    console.log("✅ Respuesta del servidor:", data);

    return data.results;
  } catch (err) {
    console.error("❌ Error general en importCsvToSupabase:", err);
    throw err;
  }
}