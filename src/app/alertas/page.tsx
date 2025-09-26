import AlertasDashboard from '@/components/alertas/AlertasDashboard';

export default function AlertasPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Alertas</h1>
          <p className="text-gray-600">Monitoreo automático de fechas críticas de producción</p>
        </div>
      </div>

      <AlertasDashboard />
    </div>
  );
}
