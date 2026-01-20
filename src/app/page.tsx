// src/app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-6">
      {/* HEADER */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo-bsg.png"
          alt="BSG Logo"
          width={80}
          height={80}
          className="mb-4"
          priority
        />
        <h1 className="text-4xl font-bold text-center">Sistema de Producción</h1>
        <p className="text-gray-600 mt-4 text-center max-w-2xl">
          Bienvenido al sistema de gestión de pedidos, producción, importación y
          alertas. Selecciona una sección para comenzar.
        </p>
      </div>

      {/* GRID DE MÓDULOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
        {/* Dashboard */}
        <Link href="/produccion/dashboard">
          <Card className="p-6 hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                Ver KPIs, gráficos y estado de producción.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Lista de POs */}
        <Link href="/produccion/pos">
          <Card className="p-6 hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>Lista de POs</CardTitle>
              <CardDescription>Ver y filtrar los Purchase Orders.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Import/Export */}
        <Link href="/import">
          <Card className="p-6 hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>Importar Datos</CardTitle>
              <CardDescription>
                Importar desde España, China o exportar Excel de producción.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Alertas */}
        <Link href="/alertas">
          <Card className="p-6 hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Ver y gestionar alertas del sistema.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* ✅ NUEVO: DESARROLLO */}
        <Link href="/desarrollo">
          <Card className="p-6 hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>Desarrollo</CardTitle>
              <CardDescription>
                Catálogo de modelos · Imágenes · Precios · Cotizaciones
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* QC MODULE */}
        <Card className="p-6 hover:shadow-lg transition">
          <CardHeader>
            <CardTitle>Quality Control (QC)</CardTitle>
            <CardDescription>Inspecciones de calidad · Upload · Reportes</CardDescription>
          </CardHeader>

          <div className="flex gap-2 mt-4">
            <Link
              href="/qc"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition"
            >
              Ver inspecciones
            </Link>

            <Link
              href="/qc/upload"
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-500 transition"
            >
              Subir QC
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
