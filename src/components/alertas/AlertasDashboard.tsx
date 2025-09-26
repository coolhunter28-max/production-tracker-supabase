// src/components/alertas/AlertasDashboard.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Alerta {
  id: string;
  tipo: string;
  subtipo: string | null;
  severidad: string;
  fecha: string;
  es_estimada: boolean;
  leida: boolean;
  po: string;
  customer: string;
  reference: string;
  style: string;
  color: string;
  mensaje: string;
}

export default function AlertasDashboard() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    customer: "todos",
    tipo: "todos",
    subtipo: "todos",
    search: "",
  });

  // ========================
  // Cargar alertas
  // ========================
  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/alertas?leida=false", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success) {
          setAlertas(data.alertas);
        } else {
          console.error("❌ Error cargando alertas:", data.error);
        }
      } catch (err) {
        console.error("❌ Error de red cargando alertas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlertas();
  }, []);

  // ========================
  // Marcar como leída
  // ========================
  const handleDescartar = async (id: string) => {
    try {
      const res = await fetch("/api/alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertas((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("❌ Error descartando alerta:", err);
    }
  };

  // ========================
  // Filtros dinámicos
  // ========================
  const customers = useMemo(
    () => ["todos", ...new Set(alertas.map((a) => a.customer).filter(Boolean))],
    [alertas]
  );

  const tipos = useMemo(
    () => ["todos", ...new Set(alertas.map((a) => a.tipo).filter(Boolean))],
    [alertas]
  );

  const subtipos = useMemo(
    () =>
      ["todos", ...new Set(alertas.map((a) => a.subtipo || "").filter(Boolean))],
    [alertas]
  );

  const alertasFiltradas = useMemo(() => {
    return alertas.filter((a) => {
      if (filtros.customer !== "todos" && a.customer !== filtros.customer)
        return false;
      if (filtros.tipo !== "todos" && a.tipo !== filtros.tipo) return false;
      if (filtros.subtipo !== "todos" && a.subtipo !== filtros.subtipo)
        return false;
      if (
        filtros.search &&
        !(
          a.po.toLowerCase().includes(filtros.search.toLowerCase()) ||
          a.reference.toLowerCase().includes(filtros.search.toLowerCase()) ||
          a.style.toLowerCase().includes(filtros.search.toLowerCase()) ||
          a.color.toLowerCase().includes(filtros.search.toLowerCase())
        )
      )
        return false;
      return true;
    });
  }, [alertas, filtros]);

  if (loading) return <p className="p-4">Cargando alertas...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sistema de Alertas</h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Customer */}
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <Select
            value={filtros.customer}
            onValueChange={(v) => setFiltros({ ...filtros, customer: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <Select
            value={filtros.tipo}
            onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subtipo */}
        <div>
          <label className="block text-sm font-medium mb-1">Subtipo</label>
          <Select
            value={filtros.subtipo}
            onValueChange={(v) => setFiltros({ ...filtros, subtipo: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {subtipos.map((s) => (
                <SelectItem key={s} value={s}>
                  {s || "-"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buscar */}
        <div>
          <label className="block text-sm font-medium mb-1">Buscar</label>
          <Input
            placeholder="PO, referencia, style, color..."
            value={filtros.search}
            onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
          />
        </div>
      </div>

      {/* Tabla de alertas */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-2 py-1">PO</th>
              <th className="px-2 py-1">Customer</th>
              <th className="px-2 py-1">Referencia</th>
              <th className="px-2 py-1">Style</th>
              <th className="px-2 py-1">Color</th>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">Subtipo</th>
              <th className="px-2 py-1">Mensaje</th>
              <th className="px-2 py-1">Fecha</th>
              <th className="px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alertasFiltradas.map((a) => (
              <tr key={a.id} className="border-t">
                <td
                  className="text-blue-600 cursor-pointer underline"
                  onClick={() => router.push(`/po/${a.po}`)}
                >
                  {a.po}
                </td>
                <td>{a.customer}</td>
                <td>{a.reference}</td>
                <td>{a.style}</td>
                <td>{a.color}</td>
                <td>{a.tipo}</td>
                <td>{a.subtipo || "-"}</td>
                <td>{a.mensaje}</td>
                <td className={a.es_estimada ? "text-red-500" : ""}>
                  {a.fecha
                    ? new Date(a.fecha).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDescartar(a.id)}
                  >
                    Descartar
                  </Button>
                </td>
              </tr>
            ))}
            {alertasFiltradas.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-4 text-gray-500">
                  ✅ No hay alertas pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
