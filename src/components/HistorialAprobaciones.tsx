import React, { useEffect, useState } from "react";
import { fetchAprobacionesByMuestra } from "../services/aprobaciones";

interface Props {
  muestraId: string;
}

const HistorialAprobaciones: React.FC<Props> = ({ muestraId }) => {
  const [aprobaciones, setAprobaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAprobacionesByMuestra(muestraId);
        setAprobaciones(data || []);
      } catch (error) {
        console.error("❌ Error al cargar aprobaciones:", error);
      } finally {
        setLoading(false);
      }
    };

    if (muestraId) fetchData();
  }, [muestraId]);

  if (loading)
    return <p className="text-gray-500 text-sm">Cargando historial...</p>;

  if (aprobaciones.length === 0)
    return (
      <p className="text-gray-500 text-sm italic">
        No hay aprobaciones registradas.
      </p>
    );

  return (
    <div className="space-y-2">
      {aprobaciones.map((a, index) => (
        <div
          key={index}
          className="border rounded p-2 bg-gray-50 text-sm flex justify-between items-center"
        >
          <span>{a.usuario || "Desconocido"}</span>
          <span>{a.fecha_aprobacion || "-"}</span>
          <span className="font-semibold text-gray-700">{a.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default HistorialAprobaciones;
