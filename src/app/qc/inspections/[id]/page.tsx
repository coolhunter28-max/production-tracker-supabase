import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { DefectBlock } from "@/components/qc/DefectBlock";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------
 * DEFECT SORTING HELPERS
 * ------------------------------------------------- */

const TYPE_ORDER: Record<string, number> = {
  critical: 1,
  major: 2,
  minor: 3,
};

const STATUS_ORDER: Record<string, number> = {
  overdue: 1,
  in_progress: 2,
  open: 3,
  closed: 4,
};

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

function sortDefects(defects: any[]) {
  return [...defects].sort((a, b) => {
    // 1️⃣ Tipo
    const typeA =
      TYPE_ORDER[a.defect_type?.toLowerCase()] ?? 99;
    const typeB =
      TYPE_ORDER[b.defect_type?.toLowerCase()] ?? 99;

    if (typeA !== typeB) return typeA - typeB;

    // 2️⃣ Estado efectivo
    const statusA =
      STATUS_ORDER[getEffectiveStatus(a)] ?? 99;
    const statusB =
      STATUS_ORDER[getEffectiveStatus(b)] ?? 99;

    if (statusA !== statusB) return statusA - statusB;

    // 3️⃣ Fallback estable
    return a.id.localeCompare(b.id);
  });
}

/* -------------------------------------------------
 * PAGE
 * ------------------------------------------------- */

export default async function QCInspectionPage({
  params,
}: {
  params: { id: string };
}) {
  /* 1) INSPECTION + DEFECTS */
  const { data: inspection, error } = await supabase
    .from("qc_inspections")
    .select(`
      *,
      qc_defects (
        *,
        qc_defect_photos (*),
        qc_defect_action_logs (*)
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !inspection) {
    return <div className="p-6">Inspection not found</div>;
  }

  /* 2) PPS PHOTOS */
  const { data: ppsPhotos } = await supabase
    .from("qc_pps_photos")
    .select("*")
    .eq("po_id", inspection.po_id)
    .order("photo_order", { ascending: true });

  /* 3) SUMMARY */
  const inspected = inspection.qty_inspected || 0;

  const sumByType = (type: string) =>
    inspection.qc_defects
      .filter((d: any) =>
        d.defect_type?.toLowerCase().includes(type)
      )
      .reduce(
        (s: number, d: any) =>
          s + (d.defect_quantity || 0),
        0
      );

  const critical = sumByType("critical");
  const major = sumByType("major");
  const minor = sumByType("minor");
  const totalDefects = critical + major + minor;

  const pct = (n: number) =>
    inspected ? Math.round((n / inspected) * 100) : 0;

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
      <h1 className="text-2xl font-bold">
        QC Inspection – {inspection.po_number}
      </h1>

      {/* SUMMARY */}
      <div className="border rounded p-4 space-y-2">
        <div className="font-semibold">Inspection Summary</div>
        <div className="text-sm">
          Inspected: <b>{inspected}</b> pairs — Total defects:{" "}
          <b>{totalDefects}</b> ({pct(totalDefects)}%)
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
                className="rounded border object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No PPS images
          </div>
        )}
      </div>

      {/* DEFECTS */}
      <div className="space-y-6">
        <div className="font-semibold">Defects</div>

        {sortDefects(inspection.qc_defects).map(
          (defect: any) => (
            <DefectBlock
              key={defect.id}
              defect={defect}
              inspectionId={inspection.id}
            />
          )
        )}
      </div>
    </div>
  );
}
