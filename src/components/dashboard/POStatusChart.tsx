"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function POStatusChart({ data }: { data: any }) {
  const chartData = [
    { name: "Delay", value: data.delay, color: "#DC2626" },       // rojo
    { name: "En producción", value: data.produccion, color: "#2563EB" }, // azul
    { name: "Finalizado", value: data.finalizado, color: "#16A34A" },    // verde
    { name: "Sin datos", value: data.sinDatos, color: "#6B7280" },       // gris
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Estado general de los POs</h3>

      <PieChart width={350} height={260}>
        <Pie
          data={chartData}
          cx={160}
          cy={120}
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
