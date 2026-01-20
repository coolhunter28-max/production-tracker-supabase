// src/app/desarrollo/page.tsx
"use client";

import Link from "next/link";

export default function DesarrolloHome() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧪 Desarrollo</h1>
        <Link href="/" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
          ← Inicio
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/desarrollo/modelos" className="block bg-white p-5 rounded-xl shadow border hover:shadow-md transition">
          <div className="text-lg font-semibold">📚 Modelos</div>
          <div className="text-sm text-gray-600">Ficha del modelo, imágenes, precios, materiales…</div>
        </Link>

        <div className="block bg-white p-5 rounded-xl shadow border opacity-60">
          <div className="text-lg font-semibold">🧮 Calculadora</div>
          <div className="text-sm text-gray-600">Coste → precio venta, margen bruto, histórico… (próximo)</div>
        </div>

        <div className="block bg-white p-5 rounded-xl shadow border opacity-60">
          <div className="text-lg font-semibold">📊 Informes</div>
          <div className="text-sm text-gray-600">Cubo/BI (por cliente, supplier, margen…) (más adelante)</div>
        </div>
      </div>
    </div>
  );
}
