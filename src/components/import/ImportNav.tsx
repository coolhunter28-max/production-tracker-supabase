"use client";

import Link from "next/link";

type ImportNavProps = {
  active?: "spain" | "china" | "export";
};

export default function ImportNav({ active }: ImportNavProps) {
  const base =
    "px-4 py-2 rounded-full text-sm border transition-colors";
  const activeCls = "bg-blue-600 text-white border-blue-600";
  const inactiveCls =
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-100";

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Link
        href="/import/spain"
        className={`${base} ${
          active === "spain" ? activeCls : inactiveCls
        }`}
      >
        🇪🇸 Import Spain
      </Link>

      <Link
        href="/import/china"
        className={`${base} ${
          active === "china" ? activeCls : inactiveCls
        }`}
      >
        🇨🇳 Import China
      </Link>

      <Link
        href="/import/export"
        className={`${base} ${
          active === "export" ? activeCls : inactiveCls
        }`}
      >
        📤 Export China
      </Link>
    </div>
  );
}
