import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function computeInspectionStatus(inspection: any) {
  const defects = inspection.qc_defects || [];
  let hasOverdue = false;
  let hasOpen = false;

  for (const d of defects) {
    const status = d.action_status || "open";

    if (
      status !== "closed" &&
      d.action_due_date &&
      new Date(d.action_due_date) < new Date()
    ) {
      hasOverdue = true;
    } else if (status !== "closed") {
      hasOpen = true;
    }
  }

  if (hasOverdue) return "blocked";
  if (hasOpen) return "pending";
  return "ok";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    blocked: "bg-red-100 text-red-700",
    pending: "bg-orange-100 text-orange-700",
    ok: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status.toUpperCase()}
    </span>
  );
}

type QCSearchParams = {
  status?: string;
  customer?: string;
  factory?: string;
  overdue?: string;
  date_from?: string;
  date_to?: string;
};

function normalizeParams(current: QCSearchParams) {
  return {
    status: current.status ?? "all",
    customer: current.customer ?? "all",
    factory: current.factory ?? "all",
    overdue: current.overdue ?? "all",
    date_from: current.date_from ?? "",
    date_to: current.date_to ?? "",
  };
}

function buildHref(
  base: string,
  current: QCSearchParams,
  patch: Partial<QCSearchParams>
) {
  const params = new URLSearchParams();
  const next = { ...normalizeParams(current), ...patch };

  if (next.status !== "all") params.set("status", next.status);
  if (next.customer !== "all") params.set("customer", next.customer);
  if (next.factory !== "all") params.set("factory", next.factory);
  if (next.overdue !== "all") params.set("overdue", next.overdue);
  if (next.date_from) params.set("date_from", next.date_from);
  if (next.date_to) params.set("date_to", next.date_to);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function buildKpiHref(base: string, current: QCSearchParams, kpiStatus: string) {
  const cur = normalizeParams(current);
  const nextStatus = cur.status === kpiStatus ? "all" : kpiStatus;
  return buildHref(base, current, { status: nextStatus });
}

function isValidDateString(s: any) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function inRange(dateStr: string | null | undefined, from?: string, to?: string) {
  if (!dateStr) return false;

  const d = new Date(dateStr).getTime();
  if (!Number.isFinite(d)) return false;

  if (from) {
    const df = new Date(from).getTime();
    if (Number.isFinite(df) && d < df) return false;
  }

  if (to) {
    const dt = new Date(to).getTime();
    if (Number.isFinite(dt) && d > dt) return false;
  }

  return true;
}

export default async function QCPage({
  searchParams,
}: {
  searchParams: QCSearchParams;
}) {
  const { data: inspections, error } = await supabase
    .from("qc_inspections")
    .select(
      `
      *,
      qc_defects (*)
    `
    )
    .order("inspection_date", { ascending: false });

  if (error) {
    return (
      <div className="space-y-2 p-6">
        <div className="font-semibold text-red-600">
          Failed to load inspections
        </div>
        <div className="text-sm text-gray-600">{error.message}</div>
      </div>
    );
  }

  const safeInspections = inspections ?? [];

  const enriched = safeInspections.map((i: any) => {
    const computedStatus = computeInspectionStatus(i);

    const hasOverdue = i.qc_defects?.some(
      (d: any) =>
        d.action_status !== "closed" &&
        d.action_due_date &&
        new Date(d.action_due_date) < new Date()
    );

    return {
      ...i,
      computedStatus,
      hasOverdue,
    };
  });

  const sp = normalizeParams(searchParams);

  const spDateFrom = isValidDateString(sp.date_from) ? sp.date_from : "";
  const spDateTo = isValidDateString(sp.date_to) ? sp.date_to : "";

  let contextFiltered = [...enriched];

  if (sp.customer !== "all") {
    contextFiltered = contextFiltered.filter((i) => i.customer === sp.customer);
  }

  if (sp.factory !== "all") {
    contextFiltered = contextFiltered.filter((i) => i.factory === sp.factory);
  }

  if (sp.overdue === "yes") {
    contextFiltered = contextFiltered.filter((i) => i.hasOverdue);
  }

  if (spDateFrom || spDateTo) {
    contextFiltered = contextFiltered.filter((i) =>
      inRange(i.inspection_date, spDateFrom || undefined, spDateTo || undefined)
    );
  }

  let filtered = [...contextFiltered];

  if (sp.status !== "all") {
    filtered = filtered.filter((i) => i.computedStatus === sp.status);
  }

  const statusOrder: Record<string, number> = {
    blocked: 1,
    pending: 2,
    ok: 3,
  };

  filtered = [...filtered].sort((a, b) => {
    const sa = statusOrder[a.computedStatus] ?? 99;
    const sb = statusOrder[b.computedStatus] ?? 99;
    if (sa !== sb) return sa - sb;

    const da = a.inspection_date ? new Date(a.inspection_date).getTime() : 0;
    const db = b.inspection_date ? new Date(b.inspection_date).getTime() : 0;
    if (da !== db) return db - da;

    return String(a.id).localeCompare(String(b.id));
  });

  const counters = {
    blocked: contextFiltered.filter((i) => i.computedStatus === "blocked").length,
    pending: contextFiltered.filter((i) => i.computedStatus === "pending").length,
    ok: contextFiltered.filter((i) => i.computedStatus === "ok").length,
  };

  const customers = Array.from(
    new Set(enriched.map((i) => i.customer).filter(Boolean))
  ).sort();

  const factories = Array.from(
    new Set(enriched.map((i) => i.factory).filter(Boolean))
  ).sort();

  const activeKpiClass = "ring-2 ring-black/10";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>

        <Link
          href="/qc/upload"
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          Subir QC Inspection
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Quality Control (QC)</h1>

      <div className="flex items-stretch gap-4">
        <Link
          href={buildKpiHref("/qc", searchParams, "blocked")}
          className={`block w-28 rounded border bg-red-50 px-4 py-2 hover:opacity-90 ${
            sp.status === "blocked" ? activeKpiClass : ""
          }`}
        >
          <div className="text-xs text-gray-500">Blocked</div>
          <div className="text-xl font-semibold text-red-700">
            {counters.blocked}
          </div>
        </Link>

        <Link
          href={buildKpiHref("/qc", searchParams, "pending")}
          className={`block w-28 rounded border bg-orange-50 px-4 py-2 hover:opacity-90 ${
            sp.status === "pending" ? activeKpiClass : ""
          }`}
        >
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-orange-700">
            {counters.pending}
          </div>
        </Link>

        <Link
          href={buildKpiHref("/qc", searchParams, "ok")}
          className={`block w-28 rounded border bg-green-50 px-4 py-2 hover:opacity-90 ${
            sp.status === "ok" ? activeKpiClass : ""
          }`}
        >
          <div className="text-xs text-gray-500">OK</div>
          <div className="text-xl font-semibold text-green-700">
            {counters.ok}
          </div>
        </Link>

        <div className="flex-1" />

        <Link
          href="/qc"
          className="self-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Reset filters
        </Link>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs">Status</label>
          <select
            name="status"
            defaultValue={sp.status}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="blocked">Blocked</option>
            <option value="pending">Pending</option>
            <option value="ok">OK</option>
          </select>
        </div>

        <div>
          <label className="text-xs">Customer</label>
          <select
            name="customer"
            defaultValue={sp.customer}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {customers.map((c) => (
              <option key={String(c)} value={String(c)}>
                {String(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs">Factory</label>
          <select
            name="factory"
            defaultValue={sp.factory}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {factories.map((f) => (
              <option key={String(f)} value={String(f)}>
                {String(f)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs">Has overdue</label>
          <select
            name="overdue"
            defaultValue={sp.overdue}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div>
          <label className="text-xs">From</label>
          <input
            type="date"
            name="date_from"
            defaultValue={spDateFrom}
            className="rounded border px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="text-xs">To</label>
          <input
            type="date"
            name="date_to"
            defaultValue={spDateTo}
            className="rounded border px-2 py-1 text-sm"
          />
        </div>

        <button type="submit" className="rounded border px-3 py-1 text-sm">
          Apply
        </button>

        <Link href="/qc" className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Report Nº</th>
              <th className="p-2 text-left">Inspector</th>
              <th className="p-2 text-left">Inspection Type</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">PO</th>
              <th className="p-2 text-left">Style</th>
              <th className="p-2 text-left">Factory</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Defects</th>
              <th className="p-2"></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="whitespace-nowrap p-2">
                  {i.inspection_date ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2 font-medium">
                  {i.report_number ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.inspector ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.inspection_type ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.customer ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.po_number ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.style ?? "-"}
                </td>
                <td className="whitespace-nowrap p-2">
                  {i.factory ?? "-"}
                </td>
                <td className="p-2">
                  <StatusBadge status={i.computedStatus} />
                </td>
                <td className="p-2 text-right">
                  {i.qc_defects?.length || 0}
                </td>
                <td className="p-2 text-right">
                  <Link
                    href={`/qc/inspections/${i.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-gray-500">
                  No inspections match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}