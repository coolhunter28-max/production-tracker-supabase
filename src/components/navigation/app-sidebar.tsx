"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Factory,
  GitBranch,
  Home,
  Menu,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

type NavItem = { label: string; href: string };

type NavSection = {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Command Center",
    icon: <Home className="h-4 w-4" />,
    items: [{ label: "Home", href: "/" }],
  },
  {
    title: "Executive",
    icon: <Zap className="h-4 w-4" />,
    items: [{ label: "Overview", href: "/analytics/executive" }],
  },
  {
    title: "Operaciones",
    icon: <Factory className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/analytics/operaciones" },
      { label: "Customers", href: "/analytics/operaciones/customers" },
      { label: "Factories", href: "/analytics/operaciones/factories" },
      { label: "Logistics", href: "/analytics/operaciones/logistica" },
    ],
  },
  {
    title: "Quality",
    icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/analytics/quality" },
      { label: "Customers", href: "/analytics/quality/customers" },
      { label: "Factories", href: "/analytics/quality/factories" },
    ],
  },
  {
    title: "Desarrollo",
    icon: <GitBranch className="h-4 w-4" />,
    items: [
      { label: "Overview", href: "/analytics/desarrollo" },
      { label: "Customers", href: "/analytics/desarrollo/customers" },
      { label: "Quotes", href: "/analytics/desarrollo/quotes" },
    ],
  },
  {
    title: "Clientes",
    icon: <Building2 className="h-4 w-4" />,
    items: [{ label: "Business Matrix", href: "/analytics/clientes" }],
  },
  {
    title: "Sistema",
    icon: <Activity className="h-4 w-4" />,
    items: [
      { label: "Import", href: "/import" },
      { label: "Alertas", href: "/alertas" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-12 items-center justify-between border-b bg-white px-4 shadow-sm xl:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Production Tracker
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Command Center
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border p-2 text-slate-700"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          <aside className="relative h-full w-72 bg-white shadow-xl">
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg border p-2 text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-white shadow-sm xl:flex xl:flex-col">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Production Tracker
            </p>
            <h2 className="text-sm font-semibold leading-tight text-slate-900">
              Command Center
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <nav className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 mt-4 flex items-center gap-2 border-t px-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                {section.icon}
                {section.title}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}