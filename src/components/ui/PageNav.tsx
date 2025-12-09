"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PageNav({ backTo }: { backTo?: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 mb-6">
      
      {/* Volver */}
      <button
        onClick={() => (backTo ? router.push(backTo) : router.back())}
        className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition font-medium shadow-sm"
      >
        ← Volver
      </button>

      {/* Inicio */}
      <Link
        href="/"
        className="px-4 py-2 rounded-md bg-gray-800 hover:bg-black text-white transition font-medium shadow-sm"
      >
        ⌂ Inicio
      </Link>
    </div>
  );
}
