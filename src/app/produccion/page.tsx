"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Upload, Download, Bell } from "lucide-react";

export default function ProduccionHome() {
  return (
    <div className="container mx-auto py-10 text-center space-y-10">

      {/* LOGO */}
      <div className="flex justify-center">
        <Image
          src="/logo_bsg.png"   // 👈 el logo que subiste
          alt="Brand Sourcing Group"
          width={150}
          height={80}
        />
      </div>

      <h1 className="text-4xl font-bold">Sistema de Producción</h1>
      <p className="text-gray-600 max-w-2xl mx-auto text-lg">
        Bienvenido al sistema de gestión de pedidos, producción, importación y alertas.
        Selecciona una sección para comenzar.
      </p>

      {/* GRID DE OPCIONES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">

        {/* DASHBOARD */}
        <Link href="/produccion/dashboard">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader>
              <BarChart3 className="w-12 h-12 mx-auto text-gray-700" />
              <CardTitle className="text-xl mt-4">Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-500 text-sm">
              Ver POs, filtros, métricas y estado general.
            </CardContent>
          </Card>
        </Link>

        {/* IMPORTAR */}
        <Link href="/produccion/import">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader>
              <Upload className="w-12 h-12 mx-auto text-gray-700" />
              <CardTitle className="text-xl mt-4">Importar Datos</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-500 text-sm">
              Subir CSV o archivo de China (muestras y producción).
            </CardContent>
          </Card>
        </Link>

        {/* EXPORTAR */}
        <Link href="/produccion/export">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader>
              <Download className="w-12 h-12 mx-auto text-gray-700" />
              <CardTitle className="text-xl mt-4">Exportar Datos</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-500 text-sm">
              Exportar información para China u otros formatos.
            </CardContent>
          </Card>
        </Link>

        {/* ALERTAS */}
        <Link href="/produccion/alertas">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardHeader>
              <Bell className="w-12 h-12 mx-auto text-gray-700" />
              <CardTitle className="text-xl mt-4">Alertas</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-500 text-sm">
              Ver y gestionar alertas del sistema.
            </CardContent>
          </Card>
        </Link>

      </div>
    </div>
  );
}
