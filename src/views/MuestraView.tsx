// src/views/MuestraView.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getMuestraById } from '../services/muestras';
import HistorialAprobaciones from '../components/HistorialAprobaciones';
import { Muestra } from '../types';

const MuestraView: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [muestra, setMuestra] = useState<Muestra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMuestra = async () => {
      if (!id) return;
      try {
        const data = await getMuestraById(id);
        setMuestra(data);
      } catch (error) {
        console.error('Error al cargar muestra:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMuestra();
  }, [id]);

  if (loading) return <div>Cargando...</div>;
  if (!muestra) return <div>Muestra no encontrada</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Gestión de Aprobaciones
        </h2>

        {/* 🔹 Solo mostramos el historial por ahora */}
        <HistorialAprobaciones muestraId={muestra.id} />
      </div>
    </div>
  );
};

export default MuestraView;
