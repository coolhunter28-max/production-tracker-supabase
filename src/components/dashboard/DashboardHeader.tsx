"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardHeader() {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold">Dashboard de Producción</h1>

      <div className="flex gap-2">
        <Link href="/">
          <Button variant="outline">Inicio</Button>
        </Link>

        <Link href="/po/nuevo/editar">
          <Button>Nuevo PO</Button>
        </Link>

        <Link href="/produccion/import">
          <Button variant="outline">Importador CSV</Button>
        </Link>
      </div>
    </div>
  );
}
