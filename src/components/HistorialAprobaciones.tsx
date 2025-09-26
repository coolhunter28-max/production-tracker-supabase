import React, { useEffect, useState } from 'react';
import { getAprobacionesByMuestra } from '../services/aprobaciones';

interface Props {
  muestraId: number;
}

const HistorialAprobaciones: React.FC<Props> = ({ muestraId }) => {
  const [aprobaciones, setAprobaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAprobaciones = async () => {
      try {
        const data = await getAprobacionesByMuestra(muestraId);
        setAprobaciones(data);
      } catch (error) {
        console.error('Error al cargar aprobaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAprobaciones();
  }, [muestraId]);

  if (loading) return <div>Cargando historial...</div>;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900">Historial de Aprobaciones</h3>
      <ul className="mt-2 space-y-3">
        {aprobaciones.map((aprobacion) => (
          <li key={aprobacion.id} className="border-l-4 pl-4 py-2">
            <div className="flex justify-between">
              <span className={`font-medium ${
                aprobacion.estado_aprobacion === 'aprobado' ? 'text-green-600' : 
                aprobacion.estado_aprobacion === 'rechazado' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {aprobacion.estado_aprobacion.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">
                {aprobacion.fecha_aprobacion 
                  ? new Date(aprobacion.fecha_aprobacion).toLocaleDateString() 
                  : 'Pendiente'}
              </span>
            </div>
            {aprobacion.comentarios && (
              <p className="text-sm text-gray-600 mt-1">{aprobacion.comentarios}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistorialAprobaciones;