import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { DefectBlock } from "@/components/qc/DefectBlock";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------
 * ACTION PLAN HELPERS
 * ------------------------------------------------- */
function getEffectiveStatus(defect: any) {
  const { action_status, action_due_date } = defect;

  if (
    action_status !== "closed" &&
    action_due_date &&
    new Date(action_due_date) < new Date()
  ) {
    return "overdue";
  }

  return action_status || "open";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    closed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? styles.open
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default async function QCInspectionPage({
  params,
}: {
  params: { id: string };
}) {
  /* -------------------------------------------------
   * 1) INSPECTION + DEFECTS
   * ------------------------------------------------- */
  const { data: inspection, error } = await supabase
    .from("qc_inspections")
    .select(`
      *,
      qc_defects (
        *,
        qc_defect_photos (*)
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !inspection) {
    return <div className="p-6">Inspection not found</div>;
  }

  /* -------------------------------------------------
   * 2) PPS PHOTOS (BY PO)
   * ------------------------------------------------- */
  const { data: ppsPhotos } = await supabase
    .from("qc_pps_photos")
    .select("*")
    .eq("po_id", inspection.po_id)
    .order("photo_order", { ascending: true });

  /* -------------------------------------------------
   * 3) SUMMARY CALCULATIONS
   * ------------------------------------------------- */
  const inspected = inspection.qty_inspected || 0;

  const sumByType = (type: string) =>
    inspection.qc_defects
      .filter((d: any) => d.defect_type?.toLowerCase().includes(type))
      .reduce((s: number, d: any) => s + (d.defect_quantity || 0), 0);

  const critical = sumByType("critical");
  const major = sumByType("major");
  const minor = sumByType("minor");

  const totalDefects = critical + major + minor;

  const pct = (n: number) =>
    inspected ? Math.round((n / inspected) * 100) : 0;

  /* ------------------------------------------------- */

  return (
    <div className="p-6 space-y-8">
      {/* NAV */}
      <div className="flex gap-4 text-sm">
        <Link href="/qc" className="text-blue-600 hover:underline">
          ← Back to inspections
        </Link>
        <Link href="/" className="text-gray-600 hover:underline">
          Home
        </Link>
      </div>

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          QC Inspection – {inspection.po_number}
        </h1>

        <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>Report: {inspection.report_number}</span>
          <span>Factory: {inspection.factory}</span>
          <span>Date: {inspection.inspection_date}</span>
          <span>Reference: {inspection.reference}</span>
          <span>Style: {inspection.style}</span>
          <span>Color: {inspection.color}</span>
          <span>Season: {inspection.season}</span>
          <span>Type: {inspection.inspection_type}</span>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="border rounded p-4 space-y-2">
        <div className="font-semibold">Inspection Summary</div>

        <div className="text-sm">
          Inspected: <b>{inspected}</b> pairs &nbsp;&nbsp;
          Total defects: <b>{totalDefects}</b> ({pct(totalDefects)}%)
        </div>

        <div className="flex gap-3 text-sm">
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
            Critical {critical} ({pct(critical)}%)
          </span>
          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">
            Major {major} ({pct(major)}%)
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            Minor {minor} ({pct(minor)}%)
          </span>
        </div>
      </div>

      {/* PPS */}
      <div>
        <div className="font-semibold mb-2">PPS / Style View</div>

        {ppsPhotos?.length ? (
          <div className="flex gap-3">
            {ppsPhotos.map((p: any) => (
              <Image
                key={p.id}
                src={p.photo_url}
                alt="PPS"
                width={120}
                height={120}
                className="rounded border object-cover cursor-pointer"
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No PPS images</div>
        )}
      </div>

      {/* DEFECTS */}
      <div className="space-y-6">
        <div className="font-semibold">Defects</div>

        {inspection.qc_defects.map((defect: any) => {
          const effectiveStatus = getEffectiveStatus(defect);

          return (
            <div key={defect.id}>
              <div className="flex justify-end mb-1">
                <StatusBadge status={effectiveStatus} />
              </div>

              <DefectBlock
                defect={defect}
                inspectionId={inspection.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
