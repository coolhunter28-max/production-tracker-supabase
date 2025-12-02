"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BarChart3, Upload, Download } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-6">
      {/* Header con logo + título */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo-bsg.png"
          alt="BSG Logo"
          width={80}
          height={80}
          className="mb-4"
          priority
        />
        <h1 className="text-4xl font-bold text-center">
          Sistema de Producción
        </h1>
      </div>

      <p className="text-gray-600 mb-10 text-center max-w-2xl">
        Bienvenido al sistema de gestión de pedidos, producción, importación y alertas.
        Selecciona una sección para comenzar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl">
        {/* Dashboard */}
<Link href="/produccion/dashboard" className="group">
  <Card className="p-6 hover:shadow-lg transition border border-gray-200">
    <CardHeader className="text-center">
      <BarChart3 className="h-10 w-10 mx-auto text-gray-700 group-hover:text-black" />
      <CardTitle className="mt-4 text-xl">Dashboard</CardTitle>
      <CardDescription className="mt-2">
        Ver POs, filtros, métricas y estado general.
      </CardDescription>
    </CardHeader>
  </Card>
</Link>


        {/* Import */}
        <Link href="/import" className="group">
          <Card className="p-6 hover:shadow-lg transition border border-gray-200">
            <CardHeader className="text-center">
              <Upload className="h-10 w-10 mx-auto text-gray-700 group-hover:text-black" />
              <CardTitle className="mt-4 text-xl">Importar Datos</CardTitle>
              <CardDescription className="mt-2">
                Subir CSV o archivo de China (muestras y producción).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Export */}
        <Link href="/export" className="group">
          <Card className="p-6 hover:shadow-lg transition border border-gray-200">
            <CardHeader className="text-center">
              <Download className="h-10 w-10 mx-auto text-gray-700 group-hover:text-black" />
              <CardTitle className="mt-4 text-xl">Exportar Datos</CardTitle>
              <CardDescription className="mt-2">
                Exportar información para China u otros formatos.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Alertas */}
        <Link href="/alertas" className="group">
          <Card className="p-6 hover:shadow-lg transition border border-gray-200">
            <CardHeader className="text-center">
              <Bell className="h-10 w-10 mx-auto text-gray-700 group-hover:text-black" />
              <CardTitle className="mt-4 text-xl">Alertas</CardTitle>
              <CardDescription className="mt-2">
                Ver y gestionar alertas del sistema.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
