"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Factory,
  GitBranch,
  Home,
  Menu,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
};

type NavSection = {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
};

const SIDEBAR_STORAGE_KEY = "production-tracker-sidebar-collapsed";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(storedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

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
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border p-2 text-slate-700"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          <aside className="relative h-full w-72 bg-white shadow-xl">
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg border p-2 text-slate-700"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r bg-white shadow-sm transition-all duration-200 xl:flex xl:flex-col ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="border-b px-3 py-3">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between gap-2"
            }`}
          >
            <div
              className={`flex items-center ${
                collapsed ? "justify-center" : "gap-2"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />

              {!collapsed && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Production Tracker
                  </p>
                  <h2 className="text-sm font-semibold leading-tight text-slate-900">
                    Command Center
                  </h2>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="rounded-md border p-1.5 text-slate-600 hover:bg-slate-50"
                aria-label="Colapsar sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-3 flex rounded-md border p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <SidebarContent pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <nav className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <div
              className={`mb-2 mt-4 flex items-center gap-2 border-t px-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 ${
                collapsed ? "justify-center px-0" : ""
              }`}
              title={collapsed ? section.title : undefined}
            >
              {section.icon}
              {!collapsed && section.title}
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                      collapsed
                        ? "justify-center px-2 py-2"
                        : "px-2.5 py-1.5"
                    } ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {collapsed ? item.label.slice(0, 1) : item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}