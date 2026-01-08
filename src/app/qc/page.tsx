import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------
 * STATUS HELPERS
 * ------------------------------------------------- */
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
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? ""
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

/* -------------------------------------------------
 * QUERY HELPERS (KPIs clicables + reset)
 * ------------------------------------------------- */
function buildHref(
  base: string,
  current: {
    status?: string;
    customer?: string;
    factory?: string;
    overdue?: string;
  },
  patch: Partial<{
    status: string;
    customer: string;
    factory: string;
    overdue: string;
  }>
) {
  const params = new URLSearchParams();

  const next = {
    status: current.status ?? "all",
    customer: current.customer ?? "all",
    factory: current.factory ?? "all",
    overdue: current.overdue ?? "all",
    ...patch,
  };

  // Guardamos solo los que no sean "all"
  if (next.status && next.status !== "all") params.set("status", next.status);
  if (next.customer && next.customer !== "all")
    params.set("customer", next.customer);
  if (next.factory && next.factory !== "all") params.set("factory", next.factory);
  if (next.overdue && next.overdue !== "all") params.set("overdue", next.overdue);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/* -------------------------------------------------
 * PAGE
 * ------------------------------------------------- */
export default async function QCPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    customer?: string;
    factory?: string;
    overdue?: string;
  };
}) {
  /* -------------------------------------------------
   * 1) LOAD DATA
   * ------------------------------------------------- */
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
      <div className="p-6 space-y-2">
        <div className="font-semibold text-red-600">Failed to load inspections</div>
        <div className="text-sm text-gray-600">{error.message}</div>
      </div>
    );
  }

  const safeInspections = inspections ?? [];

  if (safeInspections.length === 0) {
    return <div className="p-6">No inspections</div>;
  }

  /* -------------------------------------------------
   * 2) COMPUTE STATUS
   * ------------------------------------------------- */
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

  /* -------------------------------------------------
   * 3) FILTERS
   * ------------------------------------------------- */
  let filtered = [...enriched];

  const spStatus = searchParams.status ?? "all";
  const spCustomer = searchParams.customer ?? "all";
  const spFactory = searchParams.factory ?? "all";
  const spOverdue = searchParams.overdue ?? "all";

  if (spStatus !== "all") {
    filtered = filtered.filter((i) => i.computedStatus === spStatus);
  }

  if (spCustomer !== "all") {
    filtered = filtered.filter((i) => i.customer === spCustomer);
  }

  if (spFactory !== "all") {
    filtered = filtered.filter((i) => i.factory === spFactory);
  }

  if (spOverdue === "yes") {
    filtered = filtered.filter((i) => i.hasOverdue);
  }

  /* -------------------------------------------------
   * 4) SORT BY PRIORITY (blocked -> pending -> ok) + date desc
   * ------------------------------------------------- */
  const STATUS_ORDER: Record<string, number> = {
    blocked: 1,
    pending: 2,
    ok: 3,
  };

  filtered = [...filtered].sort((a, b) => {
    const sa = STATUS_ORDER[a.computedStatus] ?? 99;
    const sb = STATUS_ORDER[b.computedStatus] ?? 99;
    if (sa !== sb) return sa - sb;

    const da = a.inspection_date ? new Date(a.inspection_date).getTime() : 0;
    const db = b.inspection_date ? new Date(b.inspection_date).getTime() : 0;
    if (da !== db) return db - da;

    return String(a.id).localeCompare(String(b.id));
  });

  /* -------------------------------------------------
   * 5) COUNTERS (IMPORTANTE)
   * - Para que los KPIs tengan sentido, lo normal es:
   *   contadores sobre el dataset completo "enriched"
   *   (y el KPI aplica el filtro "status")
   * ------------------------------------------------- */
  const counters = {
    blocked: enriched.filter((i) => i.computedStatus === "blocked").length,
    pending: enriched.filter((i) => i.computedStatus === "pending").length,
    ok: enriched.filter((i) => i.computedStatus === "ok").length,
  };

  /* -------------------------------------------------
   * 6) UNIQUE FILTER VALUES
   * ------------------------------------------------- */
  const customers = Array.from(
    new Set(enriched.map((i) => i.customer).filter(Boolean))
  ).sort();

  const factories = Array.from(
    new Set(enriched.map((i) => i.factory).filter(Boolean))
  ).sort();

  /* -------------------------------------------------
   * RENDER
   * ------------------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-2xl font-bold">Quality Control (QC)</h1>

      {/* KPIs (CLICKABLES) + RESET */}
      <div className="flex gap-4 items-stretch">
        <Link
          href={buildHref("/qc", searchParams, { status: "blocked" })}
          className="border rounded px-4 py-2 bg-red-50 hover:opacity-90 block w-28"
        >
          <div className="text-xs text-gray-500">Blocked</div>
          <div className="text-xl font-semibold text-red-700">
            {counters.blocked}
          </div>
        </Link>

        <Link
          href={buildHref("/qc", searchParams, { status: "pending" })}
          className="border rounded px-4 py-2 bg-orange-50 hover:opacity-90 block w-28"
        >
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-orange-700">
            {counters.pending}
          </div>
        </Link>

        <Link
          href={buildHref("/qc", searchParams, { status: "ok" })}
          className="border rounded px-4 py-2 bg-green-50 hover:opacity-90 block w-28"
        >
          <div className="text-xs text-gray-500">OK</div>
          <div className="text-xl font-semibold text-green-700">
            {counters.ok}
          </div>
        </Link>

        <div className="flex-1" />

        <Link
          href="/qc"
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50 self-center"
        >
          Reset filters
        </Link>
      </div>

      {/* FILTERS (con APPLY) */}
      <form method="GET" className="flex gap-3 items-end">
        <div>
          <label className="text-xs">Status</label>
          <select
            name="status"
            defaultValue={spStatus}
            className="border rounded px-2 py-1 text-sm"
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
            defaultValue={spCustomer}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {customers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs">Factory</label>
          <select
            name="factory"
            defaultValue={spFactory}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {factories.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs">Has overdue</label>
          <select
            name="overdue"
            defaultValue={spOverdue}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <button className="border rounded px-3 py-1 text-sm">Apply</button>
      </form>

      {/* TABLE */}
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Date</th>
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
                <td className="p-2">{i.inspection_date}</td>
                <td className="p-2">{i.customer}</td>
                <td className="p-2">{i.po_number}</td>
                <td className="p-2">{i.style}</td>
                <td className="p-2">{i.factory}</td>
                <td className="p-2">
                  <StatusBadge status={i.computedStatus} />
                </td>
                <td className="p-2 text-right">{i.qc_defects?.length || 0}</td>
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
                <td colSpan={8} className="p-6 text-center text-gray-500">
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
