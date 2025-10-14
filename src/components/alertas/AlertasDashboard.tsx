"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Alerta = {
  id: string;
  tipo: string;
  subtipo?: string | null;
  severidad?: string | null;
  fecha: string;
  es_estimada: boolean;
  leida: boolean;
  po?: { id: string; po: string; customer?: string | null };
  linea_pedido?: { reference?: string | null; style?: string | null; color?: string | null };
  muestra?: { tipo_muestra?: string | null };
};

function daysDiffToToday(isoDate: string) {
  const hoy = new Date();
  const d = new Date(isoDate);
  return Math.round(
    (d.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return iso;
  }
}

export default function AlertasDashboard() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroCliente, setFiltroCliente] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroSubtipo, setFiltroSubtipo] = useState("Todos");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error cargando alertas");
        setAlertas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Error cargando alertas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlertas();
  }, []);

  const clientes = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => a.po?.customer && s.add(a.po.customer));
    return ["Todos", ...Array.from(s).sort()];
  }, [alertas]);

  const tipos = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => a.tipo && s.add(a.tipo));
    return ["Todos", ...Array.from(s)];
  }, [alertas]);

  const subtipos = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => {
      if (a.muestra?.tipo_muestra) s.add(a.muestra.tipo_muestra);
      else if (a.subtipo) s.add(a.subtipo);
    });
    return ["Todos", ...Array.from(s)];
  }, [alertas]);

  const filtradas = useMemo(() => {
    return alertas.filter((a) => {
      if (filtroCliente !== "Todos" && a.po?.customer !== filtroCliente)
        return false;
      if (filtroTipo !== "Todos" && a.tipo !== filtroTipo) return false;
      if (filtroSubtipo !== "Todos" && (a.muestra?.tipo_muestra || a.subtipo) !== filtroSubtipo)
        return false;
      if (texto.trim()) {
        const t = texto.toLowerCase();
        const match =
          (a.po?.po || "").toLowerCase().includes(t) ||
          (a.linea_pedido?.reference || "").toLowerCase().includes(t) ||
          (a.linea_pedido?.style || "").toLowerCase().includes(t) ||
          (a.linea_pedido?.color || "").toLowerCase().includes(t);
        if (!match) return false;
      }
      return true;
    });
  }, [alertas, filtroCliente, filtroTipo, filtroSubtipo, texto]);

  const descartar = async (id: string) => {
    try {
      await fetch("/api/alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAlertas((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("No se pudo descartar la alerta.");
    }
  };

  const goPo = (id?: string) => {
    if (id) router.push(`/po/${id}`);
  };

  if (loading) return <div>Cargando alertas...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sistema de Alertas</h2>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Cliente</div>
          <select
            className="border rounded px-2 py-1"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            {clientes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Tipo</div>
          <select
            className="border rounded px-2 py-1"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            {tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Subtipo</div>
          <select
            className="border rounded px-2 py-1"
            value={filtroSubtipo}
            onChange={(e) => setFiltroSubtipo(e.target.value)}
          >
            {subtipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-xs text-gray-500 mb-1">
            Buscar referencia / estilo / PO / color
          </div>
          <input
            className="border rounded px-2 py-1 w-full"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-2 text-left">PO</th>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">Referencia</th>
              <th className="p-2 text-left">Style</th>
              <th className="p-2 text-left">Color</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Subtipo</th>
              <th className="p-2 text-left">Mensaje</th>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((a) => {
              const dd = daysDiffToToday(a.fecha);
              const msg =
                dd < 0
                  ? `Con ${Math.abs(dd)} día(s) de retraso`
                  : dd === 0
                  ? "Es hoy"
                  : `Faltan ${dd} día(s)`;

              return (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <button
                      className="text-blue-600 underline"
                      onClick={() => goPo(a.po?.id)}
                    >
                      {a.po?.po}
                    </button>
                  </td>
                  <td className="p-2">{a.po?.customer}</td>
                  <td className="p-2">{a.linea_pedido?.reference || "-"}</td>
                  <td className="p-2">{a.linea_pedido?.style || "-"}</td>
                  <td className="p-2">{a.linea_pedido?.color || "-"}</td>
                  <td className="p-2">{a.tipo}</td>
                  <td className="p-2">
                    {a.muestra?.tipo_muestra || a.subtipo || "-"}
                  </td>
                  <td className="p-2">
                    {a.tipo === "muestra"
                      ? `La muestra ${
                          a.muestra?.tipo_muestra || a.subtipo || ""
                        } está pendiente · ${msg}`
                      : `Alerta de ${a.tipo} · ${msg}`}
                  </td>
                  <td
                    className="p-2"
                    style={{
                      color: a.es_estimada ? "red" : undefined,
                      fontWeight: a.es_estimada ? 700 : 400,
                    }}
                  >
                    {fmtDate(a.fecha)}{" "}
                    {a.es_estimada ? "(estimada)" : "(real)"}
                  </td>
                  <td className="p-2">
                    <button
                      className="border rounded px-2 py-1 hover:bg-gray-100"
                      onClick={() => descartar(a.id)}
                    >
                      Descartar
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={10} className="p-4 text-gray-500">
                  No hay alertas que cumplan los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
