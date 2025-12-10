"use client";

import ImportSpain from "@/components/dashboard/ImportSpain";
import ImportChina from "@/components/dashboard/ImportChina";

export default function ImportPage() {
  return (
    <div className="container mx-auto py-10 space-y-10">

      <h1 className="text-3xl font-bold">Importación de Datos</h1>
      <p className="text-gray-600">
        Selecciona el tipo de archivo que quieres importar.
      </p>

      {/* 🔹 Import España */}
      <div className="bg-white shadow p-6 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Importar archivo desde España (CSV)</h2>
        <ImportSpain />
      </div>

      {/* 🔹 Import China */}
      <div className="bg-white shadow p-6 border p-6 border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Importar archivo desde China (Excel)</h2>
        <ImportChina />
      </div>

      <button
        onClick={() => window.history.back()}
        className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        ← Volver
      </button>

    </div>
  );
}
