// src/services/alertas.ts
import { Alerta } from '@/types/alertas';

const API_URL = '/api/alertas';

export const alertasService = {
  // Obtener todas las alertas
  async obtenerAlertas(): Promise<Alerta[]> {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Error obteniendo alertas');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ Error en obtenerAlertas:', err);
      return [];
    }
  },

  // Generar nuevas alertas (muestras + ETD + producción)
  async generarAlertas(): Promise<Alerta[]> {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error generando alertas');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('❌ Error en generarAlertas:', err);
      return [];
    }
  },

  // Marcar como leída
  async marcarComoLeida(id: string): Promise<boolean> {
    try {
      const res = await fetch(API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return res.ok;
    } catch (err) {
      console.error('❌ Error en marcarComoLeida:', err);
      return false;
    }
  },

  // Eliminar alerta
  async eliminarAlerta(id: string): Promise<boolean> {
    try {
      const res = await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return res.ok;
    } catch (err) {
      console.error('❌ Error en eliminarAlerta:', err);
      return false;
    }
  },
};
