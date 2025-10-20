// src/views/Dashboard.tsx

import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div>
      {/* 🏠 Dashboard principal */}
      {/* Aquí puedes agregar tus widgets o tarjetas principales */}
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Panel de Control
      </h1>
      <p className="text-gray-600">
        Bienvenido al panel general del sistema de producción.
      </p>

      {/* Si más adelante vuelves a tener widgets o secciones, añádelas aquí */}
    </div>
  );
};

export default Dashboard;
