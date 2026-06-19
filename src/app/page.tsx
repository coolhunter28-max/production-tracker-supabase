import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { getCurrentUserAccess } from "@/lib/ownership";
import {
  AlertTriangle,
  ClipboardList,
  Factory,
  ShieldCheck,
  Truck,
} from "lucide-react";

import {
  getCommandCenterBundle,
  type CommandCenterAlertLevel,
  type CommandCenterCustomerGroup,
} from "@/lib/analytics/command-center";

function levelStyle(level?: CommandCenterAlertLevel | string | null) {
  if (level === "CRITICAL") return "border-red-300 bg-red-50 text-red-900";
  if (level === "WARNING") return "border-orange-300 bg-orange-50 text-orange-900";
  if (level === "MONITOR") return "border-yellow-300 bg-yellow-50 text-yellow-900";
  return "border-slate-200 bg-white text-slate-800";
}

function eventLabel(event?: string | null) {
  if (event === "SHIPPING_OVERDUE") return "Shipping overdue";
  if (event === "INSPECTION_DUE") return "Inspection due";
  if (event === "SAMPLE_PENDING") return "Sample pending";
  if (event === "SAMPLE_REJECTED") return "Sample rejected";
  if (event === "QC_PENDING") return "QC pending";
  if (event === "QC_ISSUES") return "QC issues";
  if (event === "QC_FAILED") return "QC failed";
  if (event === "BOOKING_DUE") return "Booking due";
  if (event === "CLOSING_DUE") return "Closing due";
  if (event === "TRIAL_PENDING") return "Trial pending";
  if (event === "ETD_SOON") return "ETD soon";
  return "Operational alert";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function fichaClienteHref(group: CommandCenterCustomerGroup) {
  const params = new URLSearchParams();

  params.set("customer", group.customer);

  if (group.seasons.length === 1) {
    params.set("season", group.seasons[0]);
  }

  params.set("onlyActions", "1");

  return `/ficha-cliente?${params.toString()}`;
}

export default async function HomePage() {
  const { customers, stats } = await getCommandCenterBundle();

  const access = await getCurrentUserAccess();

  const canSeeAnalytics =
    access.role === "ADMIN" ||
    access.role === "MANAGER" ||
    access.role === "VIEWER";

  const criticalCustomers = customers.filter((row) => row.critical_count > 0);
  const warningCustomers = customers.filter(
    (row) => row.critical_count === 0 && row.warning_count > 0
  );
  const monitorCustomers = customers.filter(
    (row) => row.critical_count === 0 && row.warning_count === 0 && row.monitor_count > 0
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center gap-4">
          <Image src="/logo-bsg.png" alt="BSG Logo" width={56} height={56} priority />

          <div>
            <p className="text-sm font-medium text-slate-500">Production Tracker</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Command Center
            </h1>
            <p className="text-sm text-slate-600">
              Mesa diaria de trabajo: clientes, ETDs y frentes operativos abiertos.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <CommandCard
            title="Shipping overdue"
            icon={<Truck className="h-5 w-5" />}
            href="/ficha-cliente?onlyActions=1"
            value={stats.shipping_overdue_count}
            label="embarques vencidos"
            critical={stats.shipping_overdue_count > 0}
          />

          <CommandCard
            title="Inspection due"
            icon={<ClipboardList className="h-5 w-5" />}
            href="/ficha-cliente?onlyActions=1"
            value={stats.inspection_due_count}
            label="inspecciones pendientes"
          />

          <CommandCard
            title="Sample pending"
            icon={<Factory className="h-5 w-5" />}
            href="/ficha-cliente?onlyActions=1"
            value={stats.sample_pending_count}
            label="muestras pendientes"
          />

          <CommandCard
            title="QC pending"
            icon={<ShieldCheck className="h-5 w-5" />}
            href="/ficha-cliente?onlyActions=1"
            value={stats.qc_pending_count}
            label="QC pendientes"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-base font-semibold text-slate-950">
                  Clientes con frentes abiertos
                </h2>
              </div>

              <Link
                href="/ficha-cliente?onlyActions=1"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Abrir Ficha Cliente
              </Link>
            </div>

            <div className="grid gap-4">
              <CustomerGroup title="Critical" customers={criticalCustomers} />
              <CustomerGroup title="Warning" customers={warningCustomers} />
              <CustomerGroup title="Monitor" customers={monitorCustomers} />
            </div>
          </div>

          <div className="space-y-4">
            <Panel title="Resumen operativo" icon={<Factory className="h-5 w-5" />}>
              <MiniStat label="Clientes con frentes" value={stats.customers_with_fronts} />
              <MiniStat label="Frentes abiertos" value={stats.fronts_total} />
              <MiniStat label="Clientes críticos" value={stats.critical_customers} />
              <MiniStat label="Clientes warning" value={stats.warning_customers} />
            </Panel>

            <Panel title="Accesos rápidos" icon={<ClipboardList className="h-5 w-5" />}>
              <QuickLink href="/ficha-cliente" label="Ficha Cliente" />
              <QuickLink href="/ficha-cliente?onlyActions=1" label="Ficha Cliente · Solo acciones" />
              <QuickLink href="/produccion/dashboard" label="Dashboard producción" />
              <QuickLink href="/produccion/pos" label="Lista de POs" />
              <QuickLink href="/qc" label="QC inspecciones" />
              <QuickLink href="/import" label="Importar datos" />
            </Panel>

            {canSeeAnalytics && (
  <Panel title="Analytics" icon={<ShieldCheck className="h-5 w-5" />}>
    <QuickLink href="/analytics/executive" label="Executive Analytics" />
    <QuickLink href="/analytics/operaciones" label="Operaciones Analytics" />
    <QuickLink href="/analytics/quality" label="Quality Analytics" />
    <QuickLink href="/analytics/situation" label="Situation Analytics" />
  </Panel>
)}
          </div>
        </section>
      </div>
    </main>
  );
}

function CustomerGroup({
  title,
  customers,
}: {
  title: string;
  customers: CommandCenterCustomerGroup[];
}) {
  if (customers.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      <div className="grid gap-2">
        {customers.map((customer) => (
          <CustomerRow key={customer.customer} customer={customer} />
        ))}
      </div>
    </section>
  );
}

function CustomerRow({ customer }: { customer: CommandCenterCustomerGroup }) {
  return (
    <Link
      href={fichaClienteHref(customer)}
      className={`block rounded-lg border p-3 text-sm transition hover:shadow-sm ${levelStyle(
        customer.top_alert_level
      )}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{customer.customer}</p>

            <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
              {eventLabel(customer.top_alert_event)}
            </span>

            <span className="text-xs opacity-75">
              {customer.fronts_count} frentes
            </span>
          </div>

          <p className="mt-1 text-xs opacity-80">
            Seasons: {customer.seasons.join(", ")} · Next ETD {formatDate(customer.next_etd)} · Qty{" "}
            {customer.qty_total.toLocaleString("es-ES")}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <Signal label="Shipping" value={customer.shipping_overdue_count} tone="critical" />
            <Signal label="Inspection" value={customer.inspection_due_count} tone="warning" />
            <Signal label="Samples" value={customer.sample_pending_count + customer.sample_rejected_count} tone="warning" />
            <Signal label="QC" value={customer.qc_pending_count + customer.qc_issues_count + customer.qc_failed_count} tone="monitor" />
            <Signal label="Booking" value={customer.booking_due_count} tone="warning" />
            <Signal label="Closing" value={customer.closing_due_count} tone="warning" />
            <Signal label="Trial" value={customer.trial_pending_count} tone="monitor" />
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
          {customer.top_alert_level}
        </span>
      </div>
    </Link>
  );
}

function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "warning" | "monitor";
}) {
  if (value <= 0) return null;

  const className =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-yellow-200 bg-yellow-50 text-yellow-700";

  return (
    <span className={`rounded border px-2 py-1 text-xs font-medium ${className}`}>
      {label}: {value}
    </span>
  );
}

function CommandCard({
  title,
  icon,
  href,
  value,
  label,
  critical = false,
}: {
  title: string;
  icon: ReactNode;
  href: string;
  value: number;
  label: string;
  critical?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 shadow-sm transition hover:shadow-sm ${
        critical ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-slate-700">{icon}</div>
        <span className="text-2xl font-semibold text-slate-950">{value}</span>
      </div>

      <div className="mt-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Link>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-700">
        {icon}
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>

      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}