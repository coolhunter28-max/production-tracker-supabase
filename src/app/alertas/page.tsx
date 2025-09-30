"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Alerta {
  id: string;
  po_id: string;
  po_number: string;
  cliente: string;
  referencia: string;
  style: string;
  color: string;
  tipo: string;
  subtipo: string;
  fecha: string;
  mensaje: string;
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    const fetchAlertas = async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .eq("leida", false);

      if (!error && data) {
        setAlertas(data as Alerta[]);
      }
    };

    fetchAlertas();
  }, []);

  const descartarAlerta = async (id: string) => {
    await supabase.from("alertas").update({ leida: true }).eq("id", id);
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sistema de Alertas</h1>
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm border">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-2 py-1">PO</th>
              <th className="px-2 py-1">Cliente</th>
              <th className="px-2 py-1">Referencia</th>
              <th className="px-2 py-1">Style</th>
              <th className="px-2 py-1">Color</th>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">Subtipo</th>
              <th className="px-2 py-1">Fecha</th>
              <th className="px-2 py-1">Mensaje</th>
              <th className="px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-2 py-1 text-blue-600 underline">
                  <Link href={`/po/${a.po_id}/editar`}>{a.po_number}</Link>
                </td>
                <td className="px-2 py-1">{a.cliente}</td>
                <td className="px-2 py-1">{a.referencia}</td>
                <td className="px-2 py-1">{a.style}</td>
                <td className="px-2 py-1">{a.color}</td>
                <td className="px-2 py-1">{a.tipo}</td>
                <td className="px-2 py-1">{a.subtipo}</td>
                <td className="px-2 py-1">{a.fecha}</td>
                <td className="px-2 py-1">{a.mensaje}</td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => descartarAlerta(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    Descartar
                  </button>
                </td>
              </tr>
            ))}
            {alertas.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-4 text-gray-500">
                  No hay alertas pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
