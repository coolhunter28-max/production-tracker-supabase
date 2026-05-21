"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { toast } from "sonner";

type CommandItem = {
  label: string;
  description: string;
  href: string;
  keywords?: string[];
};

const items: CommandItem[] = [
  {
    label: "Command Center",
    description: "Home operativo diario",
    href: "/",
    keywords: ["home", "inicio"],
  },
  {
    label: "Executive Dashboard",
    description: "Prioridades ejecutivas y action queue",
    href: "/analytics/executive",
    keywords: ["executive", "risk", "actions"],
  },
  {
    label: "Operaciones Overview",
    description: "Producción, logística y factories",
    href: "/analytics/operaciones",
    keywords: ["production", "operaciones", "factory"],
  },
  {
    label: "Operaciones Customers",
    description: "Ranking operativo por cliente",
    href: "/analytics/operaciones/customers",
    keywords: ["customers", "clientes", "operaciones"],
  },
  {
    label: "Operaciones Factories",
    description: "Riesgo y performance por fábrica",
    href: "/analytics/operaciones/factories",
    keywords: ["factory", "factories", "fabrica"],
  },
  {
    label: "Logistics",
    description: "Presión logística y booking delay",
    href: "/analytics/operaciones/logistica",
    keywords: ["logistics", "shipping", "booking"],
  },
  {
    label: "Quality Overview",
    description: "QC analytics por cliente, fábrica y style",
    href: "/analytics/quality",
    keywords: ["quality", "qc"],
  },
  {
    label: "Desarrollo Overview",
    description: "Pricing, negociación y conversión",
    href: "/analytics/desarrollo",
    keywords: ["development", "desarrollo", "pricing"],
  },
  {
    label: "Development Quotes",
    description: "Detalle quote to order",
    href: "/analytics/desarrollo/quotes",
    keywords: ["quotes", "cotizaciones"],
  },
  {
    label: "Clientes Business Matrix",
    description: "Customer Situation Board",
    href: "/analytics/clientes",
    keywords: ["clientes", "customers", "business matrix"],
  },
  {
    label: "Import",
    description: "Importación de datos",
    href: "/import",
    keywords: ["import", "upload"],
  },
  {
    label: "Alertas",
    description: "Alertas operativas",
    href: "/alertas",
    keywords: ["alerts", "alertas"],
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return navigator.platform.toLowerCase().includes("mac") ? "⌘ K" : "Ctrl K";
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (isModifierPressed && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigate(href: string) {
    toast.success("Navegación rápida activada");
  
    setOpen(false);
  
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 md:inline-flex"
      >
        <Search className="h-4 w-4" />
        <span>Buscar</span>
        <kbd className="rounded border bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
          {shortcutLabel}
        </kbd>
      </button>
      <button
  type="button"
  onClick={() => toast.success("Sistema operativo listo")}
  className="hidden"
>
  Test
</button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/30 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar búsqueda"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          <Command className="relative mx-auto mt-24 max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <Command.Input
                autoFocus
                placeholder="Buscar pantalla o acción..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <Command.List className="max-h-[420px] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-slate-500">
                No hay resultados.
              </Command.Empty>

              {items.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.description} ${
                    item.keywords?.join(" ") ?? ""
                  }`}
                  onSelect={() => navigate(item.href)}
                  className="cursor-pointer rounded-xl px-3 py-3 outline-none data-[selected=true]:bg-slate-100"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}