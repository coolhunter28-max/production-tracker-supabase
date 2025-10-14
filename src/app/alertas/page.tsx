"use client";

import { useEffect, useState } from "react";

type Alerta = {
  id: string;
  tipo: string;
  subtipo: string;
  fecha: string;
  severidad: string;
  mensaje: string;
  po?: {
    id: string;
    po: string;
    customer: string;
  } | null;
};

export default function PaginaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [tipoMensaje, setTipoMensaje] = useState<"ok" | "info" | "error" | null>(
    null
  );

  const cargarAlertas = async () => {
    try {
      console.log("📡 Cargando alertas...");
      setLoading(true);
      const res = await fetch("/api/alertas", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al cargar alertas");
      setAlertas(Array.isArray(data) ? data : []);
      console.log(`✅ ${data.length} alertas cargadas`);
    } catch (err) {
      console.error("❌ Error cargando alertas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const generarAlertas = async () => {
    try {
      console.log("📢 Generando alertas...");
      setMensaje("⏳ Generando alertas...");
      setTipoMensaje("info");

      const res = await fetch("/api/generar-alertas", { method: "POST" });
      const data = await res.json();

      console.log("🔍 Respuesta de /api/generar-alertas:", data);

      if (!res.ok) throw new Error(data.error || "Error HTTP");

      // Detecta correctamente éxito
      if (data.success) {
        const count = data.count || 0;
        setTipoMensaje("ok");
        setMensaje(
          count > 0
            ? `✅ Se generaron ${count} alertas nuevas.`
            : "ℹ️ No se generaron alertas nuevas."
        );
        await cargarAlertas();
      } else {
        throw new Error(data.error || "Error desconocido en generación");
      }
    } catch (err) {
      console.error("❌ Error generando alertas:", err);
      setTipoMensaje("error");
      setMensaje("❌ Error al generar alertas.");
    } finally {
      // Oculta el mensaje automáticamente tras 5 segundos
      setTimeout(() => setMensaje(null), 5000);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📢 Sistema de Alertas</h1>
        <button
          onClick={generarAlertas}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          ⚙️ Generar Alertas
        </button>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-md border transition-all ${
            tipoMensaje === "ok"
              ? "bg-green-100 text-green-800 border-green-300"
              : tipoMensaje === "info"
              ? "bg-blue-100 text-blue-800 border-blue-300"
              : "bg-red-100 text-red-800 border-red-300"
          }`}
        >
          {mensaje}
        </div>
      )}

      {loading ? (
        <p>Cargando alertas...</p>
      ) : alertas.length === 0 ? (
        <p className="text-gray-500">No hay alertas que cumplan los filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">PO</th>
                <th className="p-2 border">Cliente</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Subtipo</th>
                <th className="p-2 border">Mensaje</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Severidad</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((a) => (
                <tr key={a.id} className="border hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {a.po?.po || "-"}
                  </td>
                  <td className="p-2 border text-center">
                    {a.po?.customer || "-"}
                  </td>
                  <td className="p-2 border text-center">{a.tipo}</td>
                  <td className="p-2 border text-center">{a.subtipo}</td>
                  <td className="p-2 border">{a.mensaje}</td>
                  <td className="p-2 border text-center">
                    {new Date(a.fecha).toLocaleDateString("es-ES")}
                  </td>
                  <td
                    className={`p-2 border text-center font-semibold ${
                      a.severidad === "alta"
                        ? "text-red-600"
                        : a.severidad === "media"
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                  >
                    {a.severidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
