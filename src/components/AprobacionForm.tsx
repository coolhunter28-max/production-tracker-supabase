// src/components/AprobacionForm.tsx (actualizado)
import React, { useState } from 'react';
import { createAprobacion, updateAprobacion } from '../services/aprobaciones';

interface Props {
  muestraId: number;
  onSaved: () => void;
  existingAprobacion?: Aprobacion; // Importar el tipo
}

const AprobacionForm: React.FC<Props> = ({ muestraId, onSaved, existingAprobacion }) => {
  const [estado, setEstado] = useState<'aprobado' | 'rechazado' | 'pendiente'>(
    existingAprobacion?.estado_aprobacion || 'pendiente'
  );
  const [comentarios, setComentarios] = useState<string>(existingAprobacion?.comentarios || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload: Omit<Aprobacion, 'id' | 'created_at'> = {
        muestra_id: muestraId,
        estado_aprobacion: estado,
        comentarios: comentarios || null,
        fecha_aprobacion: estado !== 'pendiente' ? new Date().toISOString() : null
      };

      if (existingAprobacion) {
        await updateAprobacion(existingAprobacion.id, payload);
      } else {
        await createAprobacion(payload);
      }
      
      onSaved();
    } catch (error) {
      console.error('Error al guardar aprobación:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Estado</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as any)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Comentarios</label>
        <textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          rows={3}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
      >
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
};

export default AprobacionForm;