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
  const { data: inspections } = await supabase
    .from("qc_inspections")
    .select(`
      *,
      qc_defects (*)
    `)
    .order("inspection_date", { ascending: false });

  if (!inspections) {
    return <div className="p-6">No inspections</div>;
  }

  /* -------------------------------------------------
   * 2) COMPUTE STATUS
   * ------------------------------------------------- */
  const enriched = inspections.map((i: any) => {
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

  if (searchParams.status && searchParams.status !== "all") {
    filtered = filtered.filter(
      (i) => i.computedStatus === searchParams.status
    );
  }

  if (searchParams.customer && searchParams.customer !== "all") {
    filtered = filtered.filter(
      (i) => i.customer === searchParams.customer
    );
  }

  if (searchParams.factory && searchParams.factory !== "all") {
    filtered = filtered.filter(
      (i) => i.factory === searchParams.factory
    );
  }

  if (searchParams.overdue === "yes") {
    filtered = filtered.filter((i) => i.hasOverdue);
  }

  /* -------------------------------------------------
   * 4) COUNTERS (SOBRE FILTRADO)
   * ------------------------------------------------- */
  const counters = {
    blocked: filtered.filter((i) => i.computedStatus === "blocked").length,
    pending: filtered.filter((i) => i.computedStatus === "pending").length,
    ok: filtered.filter((i) => i.computedStatus === "ok").length,
  };

  /* -------------------------------------------------
   * 5) UNIQUE FILTER VALUES
   * ------------------------------------------------- */
  const customers = Array.from(
    new Set(enriched.map((i) => i.customer).filter(Boolean))
  );

  const factories = Array.from(
    new Set(enriched.map((i) => i.factory).filter(Boolean))
  );

  /* -------------------------------------------------
   * RENDER
   * ------------------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-2xl font-bold">Quality Control (QC)</h1>

      {/* COUNTERS */}
      <div className="flex gap-4">
        <div className="border rounded px-4 py-2 bg-red-50">
          <div className="text-xs text-gray-500">Blocked</div>
          <div className="text-xl font-semibold text-red-700">
            {counters.blocked}
          </div>
        </div>

        <div className="border rounded px-4 py-2 bg-orange-50">
          <div className="text-xs text-gray-500">Pending</div>
          <div className="text-xl font-semibold text-orange-700">
            {counters.pending}
          </div>
        </div>

        <div className="border rounded px-4 py-2 bg-green-50">
          <div className="text-xs text-gray-500">OK</div>
          <div className="text-xl font-semibold text-green-700">
            {counters.ok}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <form className="flex gap-3 items-end">
        <div>
          <label className="text-xs">Status</label>
          <select
            name="status"
            defaultValue={searchParams.status ?? "all"}
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
            defaultValue={searchParams.customer ?? "all"}
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
            defaultValue={searchParams.factory ?? "all"}
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
            defaultValue={searchParams.overdue ?? "all"}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <button className="border rounded px-3 py-1 text-sm">
          Apply
        </button>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
