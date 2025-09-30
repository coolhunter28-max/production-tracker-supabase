"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Alerta = {
  id: string;
  tipo: "muestra" | "produccion" | "etd" | string;
  subtipo?: string | null;
  severidad?: string | null;
  fecha: string; // ISO
  es_estimada: boolean;
  leida: boolean;
  pos?: { id: string; po: string; customer: string };
  lineas_pedido?: { reference: string; style: string; color: string };
  muestras?: { tipo_muestra: string | null };
};

// util: días desde hoy hasta fecha (negativo si retraso)
function daysDiffToToday(isoDate: string) {
  const today = new Date();
  const d = new Date(isoDate);
  const ms = d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export default function AlertasDashboard() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [filtroCliente, setFiltroCliente] = useState<string>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("Todos");
  const [filtroSubtipo, setFiltroSubtipo] = useState<string>("Todos");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const res = await fetch("/api/alertas?leida=false");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error cargando alertas");
        setAlertas(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("❌ Error cargando alertas:", e);
        setAlertas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAlertas();
  }, []);

  // opciones de filtros
  const clientes = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => a.pos?.customer && s.add(a.pos.customer));
    return ["Todos", ...Array.from(s).sort()];
  }, [alertas]);

  const tipos = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => a.tipo && s.add(a.tipo));
    return ["Todos", ...Array.from(s).sort()];
  }, [alertas]);

  const subtipos = useMemo(() => {
    const s = new Set<string>();
    alertas.forEach((a) => {
      if (a.tipo === "muestra" && a.muestras?.tipo_muestra) {
        s.add(a.muestras.tipo_muestra);
      } else if (a.tipo !== "muestra" && a.subtipo) {
        s.add(a.subtipo);
      }
    });
    return ["Todos", ...Array.from(s).sort()];
  }, [alertas]);

  const filtradas = useMemo(() => {
    return alertas.filter((a) => {
      if (filtroCliente !== "Todos" && a.pos?.customer !== filtroCliente)
        return false;
      if (filtroTipo !== "Todos" && a.tipo !== filtroTipo) return false;

      if (filtroSubtipo !== "Todos") {
        const st =
          a.tipo === "muestra" ? a.muestras?.tipo_muestra : a.subtipo || "-";
        if (st !== filtroSubtipo) return false;
      }

      if (texto.trim()) {
        const t = texto.toLowerCase();
        const hay =
          (a.pos?.po || "").toLowerCase().includes(t) ||
          (a.lineas_pedido?.reference || "").toLowerCase().includes(t) ||
          (a.lineas_pedido?.style || "").toLowerCase().includes(t) ||
          (a.lineas_pedido?.color || "").toLowerCase().includes(t);
        if (!hay) return false;
      }

      return true;
    });
  }, [alertas, filtroCliente, filtroTipo, filtroSubtipo, texto]);

  const descartar = async (id: string) => {
    try {
      const res = await fetch("/api/alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("No se pudo descartar");
      setAlertas((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("❌ Error al descartar:", e);
      alert("No se pudo descartar la alerta.");
    }
  };

  // ✅ Si el PO tiene número → lo usa, si no → fallback al UUID
  const goPo = (po?: string, uuid?: string) => {
    if (po) {
      router.push(`/po/${po}`);
    } else if (uuid) {
      router.push(`/po/${uuid}`);
    }
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
              <option key={c} value={c}>
                {c}
              </option>
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
              <option key={t} value={t}>
                {t}
              </option>
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
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <div className="text-xs text-gray-500 mb-1">
            Buscar referencia / estilo / PO / color
          </div>
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="Ej: 78040, Luca, PO-G-010777..."
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
              <th className="text-left p-2">PO</th>
              <th className="text-left p-2">Cliente</th>
              <th className="text-left p-2">Referencia</th>
              <th className="text-left p-2">Style</th>
              <th className="text-left p-2">Color</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Subtipo</th>
              <th className="text-left p-2">Mensaje</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((a) => {
              const poNumber = a.pos?.po;
              const uuid = a.pos?.id;
              const st =
                a.tipo === "muestra"
                  ? a.muestras?.tipo_muestra || "-"
                  : a.subtipo || "-";

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
                      onClick={() => goPo(poNumber, uuid)}
                    >
                      {poNumber || "(sin PO)"}
                    </button>
                  </td>
                  <td className="p-2">{a.pos?.customer}</td>
                  <td className="p-2">{a.lineas_pedido?.reference}</td>
                  <td className="p-2">{a.lineas_pedido?.style}</td>
                  <td className="p-2">{a.lineas_pedido?.color}</td>
                  <td className="p-2">{a.tipo}</td>
                  <td className="p-2">{st}</td>
                  <td className="p-2">
                    {a.tipo === "muestra"
                      ? `La muestra ${st} está pendiente · ${msg}`
                      : `Alerta de ${a.tipo} · ${msg}`}
                  </td>
                  <td
                    className="p-2"
                    style={{
                      color: a.es_estimada ? "red" : undefined,
                      fontWeight: a.es_estimada ? 700 : 400,
                    }}
                  >
                    {fmtDate(a.fecha)} {a.es_estimada ? "(estimada)" : "(real)"}
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
                <td className="p-4 text-gray-500" colSpan={10}>
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
