"use client";

import Link from "next/link";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProduccionImportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-10 space-y-8">
        {/* Título principal */}
        <div>
          <h1 className="text-3xl font-bold">Importar Datos</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Elige qué tipo de importación quieres realizar. 
            El importador CSV crea y actualiza POs desde los Excel de España,
            y el importador de China actualiza fechas de muestras, producción y logística.
          </p>
        </div>

        {/* Tarjetas de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Importador CSV (España) */}
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardHeader>
              <Upload className="w-10 h-10 text-gray-700 mb-2" />
              <CardTitle>Importador CSV (España)</CardTitle>
              <CardDescription>
                Flujo de 4 pasos para importar y actualizar POs desde el archivo CSV/Excel de España.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/import">
                <Button>Ir al importador CSV</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Importador China (fechas) */}
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardHeader>
              <FileSpreadsheet className="w-10 h-10 text-gray-700 mb-2" />
              <CardTitle>Importador China</CardTitle>
              <CardDescription>
                Actualiza fechas de muestras, trials, producción, inspection y shipping
                a partir del archivo Excel que devuelve la oficina de China.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/produccion/dashboard">
                <Button variant="outline">Abrir dashboard de producción</Button>
              </Link>
              <p className="text-xs text-gray-500 mt-3">
                Dentro del dashboard encontrarás el bloque{" "}
                <span className="font-semibold">&quot;Importar datos desde China&quot;</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
