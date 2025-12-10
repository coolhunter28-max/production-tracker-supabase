"use client";

import { useRouter } from "next/navigation";

export default function AlertsHeader() {
  const router = useRouter();

  return (
    <div className="flex justify-end gap-4 mb-6">
      <button
        onClick={() => router.push("/")}
        className="px-4 py-2 rounded-md bg-white shadow hover:bg-gray-100"
      >
        Inicio
      </button>

      <button
        onClick={() => router.refresh()}
        className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
      >
        Generar alertas
      </button>
    </div>
  );
}
