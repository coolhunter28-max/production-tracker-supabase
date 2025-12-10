"use client";

import Link from "next/link";
import AlertsBox from "@/components/dashboard/AlertsBox";

export default function AlertasPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header sencillo */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de Producción</h1>

        <Link href="/">
          <button className="px-4 py-2 rounded-md border bg-white hover:bg-gray-100 text-sm">
            Inicio
          </button>
        </Link>
      </div>

      {/* Aquí reutilizamos EXACTAMENTE el mismo módulo de alertas del dashboard */}
      <AlertsBox />
    </div>
  );
}
