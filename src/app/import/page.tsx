"use client";

import Link from "next/link";

export default function ImportHubPage() {
  return (
    <div className="container mx-auto py-10 space-y-6">

      <div className="flex gap-4">
        <Link href="/import/spain">
          <button className="px-4 py-2 rounded-full border">🇪🇸 Import Spain</button>
        </Link>

        <Link href="/import/china">
          <button className="px-4 py-2 rounded-full border">🇨🇳 Import China</button>
        </Link>

        <Link href="/import/export">
          <button className="px-4 py-2 rounded-full border">📤 Export China</button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Importar / Exportar datos</h1>

      <p className="text-gray-600">
        Elige si quieres importar datos desde España, desde China o generar el Excel de producción para China.
      </p>
    </div>
  );
}
