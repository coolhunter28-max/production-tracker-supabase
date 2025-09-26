// src/views/MuestraView.tsx (actualizado)
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMuestraById } from '../services/muestras';
import AprobacionForm from '../components/AprobacionForm';
import HistorialAprobaciones from '../components/HistorialAprobaciones';
import { Muestra } from '../types';

const MuestraView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [muestra, setMuestra] = useState<Muestra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMuestra = async () => {
      if (!id) return;
      
      try {
        const data = await getMuestraById(parseInt(id));
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
      {/* ... (contenido existente) */}
      
      {/* Nueva sección de aprobaciones */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestión de Aprobaciones</h2>
        <AprobacionForm 
          muestraId={muestra.id} 
          onSaved={() => {/* Recargar datos si es necesario */}} 
        />
        <HistorialAprobaciones muestraId={muestra.id} />
      </div>
    </div>
  );
};

export default MuestraView;