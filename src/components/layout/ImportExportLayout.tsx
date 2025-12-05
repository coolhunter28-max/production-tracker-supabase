"use client";

import { useRouter, usePathname } from "next/navigation";
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

export default function ImportExportLayout({
  children,
  title,
  subtitle,
}: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { href: "/import/spain", label: "Import Spain", icon: "🇪🇸" },
    { href: "/import/china", label: "Import China", icon: "🇨🇳" },
    { href: "/import/export", label: "Export China", icon: "📤" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      {/* BOTONES SUPERIORES */}
      <div className="flex justify-between mb-8">
        <button
          onClick={() => router.push("/import")}
          className="px-4 py-2 rounded-md bg-white shadow hover:bg-gray-100"
        >
          ← Volver
        </button>

        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow"
        >
          🏠 Inicio
        </button>
      </div>

      {/* TÍTULO */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-gray-600 mt-2">{subtitle}</p>
      </div>

      {/* TABS */}
      <div className="flex justify-center gap-4 mb-10">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const base =
            "px-6 py-3 rounded-full border shadow-sm flex items-center gap-2 transition";
          const activeCls =
            "bg-blue-600 text-white border-blue-600 shadow-md";
          const inactiveCls =
            "bg-white hover:bg-gray-100 border-gray-300 text-gray-800";

          return (
            <button
              key={t.href}
              onClick={() => router.push(t.href)}
              className={`${base} ${active ? activeCls : inactiveCls}`}
            >
              <span>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO */}
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        {children}
      </div>
    </div>
  );
}
