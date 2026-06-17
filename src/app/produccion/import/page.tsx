"use client";

import { useState } from "react";
import Link from "next/link";
import ImportSpain from "@/components/dashboard/ImportSpain";
import ImportChina from "@/components/dashboard/ImportChina";

export default function ProduccionImportPage() {
  const [chinaFile, setChinaFile] = useState<File | null>(null);
  const [importingChina, setImportingChina] = useState(false);
  const [importChinaMsg, setImportChinaMsg] = useState("");

  const handleChinaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChinaFile(e.target.files?.[0] || null);
    setImportChinaMsg("");
  };

  const handleImportChina = async (): Promise<string> => {
    if (!chinaFile) {
      const msg = "Selecciona un archivo .xlsx primero.";
      setImportChinaMsg(msg);
      return msg;
    }

    setImportingChina(true);
    setImportChinaMsg("");

    try {
      const formData = new FormData();
      formData.append("file", chinaFile);

      const res = await fetch("/api/import-china", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        const msg = json.error || "Error al importar archivo China.";
        setImportChinaMsg(msg);
        return msg;
      }

      const avisos = json.avisos ?? [];
      const errores = json.errores ?? [];

      const msg =
        `Importación China completada:\n` +
        `• POs encontrados: ${json.pos_encontrados ?? 0}\n` +
        `• Líneas actualizadas: ${json.lineas_actualizadas ?? 0}\n` +
        `• Muestras actualizadas: ${json.muestras_actualizadas ?? 0}\n` +
        `• Avisos: ${avisos.length}\n` +
        `• Errores: ${errores.length}`;

      setImportChinaMsg(msg);
      return msg;
    } catch (error) {
      const msg =
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado.";

      setImportChinaMsg(msg);
      return msg;
    } finally {
      setImportingChina(false);
    }
  };

  return (
    <main className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Importación Producción</h1>

        <Link
          href="/produccion/dashboard"
          className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          ← Volver
        </Link>
      </div>

      <section className="rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">
          Importar archivo España CSV
        </h2>
        <ImportSpain />
      </section>

      <section className="rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">
          Importar archivo desde China Excel
        </h2>

        <ImportChina
          chinaFile={chinaFile}
          importingChina={importingChina}
          importChinaMsg={importChinaMsg}
          handleChinaFileChange={handleChinaFileChange}
          handleImportChina={handleImportChina}
        />
      </section>
    </main>
  );
}