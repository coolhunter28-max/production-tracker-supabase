"use client";
import React from "react";

export default function ConfirmStep({
  fileName,
  groupedPOs,
  onBack,
  onConfirm,
}: {
  fileName?: string;
  groupedPOs: any[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-4">Confirmar importación</h2>
      <p className="mb-2">Archivo: {fileName || "(sin nombre)"}</p>
      <p className="mb-6">Total POs: {groupedPOs?.length || 0}</p>

      <div className="flex justify-center gap-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={onBack}>
          ← Volver
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={onConfirm}
        >
          Confirmar importación →
        </button>
      </div>
    </div>
  );
}
