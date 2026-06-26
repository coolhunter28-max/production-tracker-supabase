import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { DefectBlock } from "@/components/qc/DefectBlock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

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
    const typeA = TYPE_ORDER[a.defect_type?.toLowerCase()] ?? 99;
    const typeB = TYPE_ORDER[b.defect_type?.toLowerCase()] ?? 99;

    if (typeA !== typeB) return typeA - typeB;

    const statusA = STATUS_ORDER[getEffectiveStatus(a)] ?? 99;
    const statusB = STATUS_ORDER[getEffectiveStatus(b)] ?? 99;

    if (statusA !== statusB) return statusA - statusB;

    return a.id.localeCompare(b.id);
  });
}

export default async function QCInspectionPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: ppsPhotos } = await supabase
  .from("qc_pps_photos")
  .select("*")
  .eq("po_id", inspection.po_id)
  .eq("reference", inspection.reference)
  .eq("style", inspection.style)
  .eq("color", inspection.color)
  .order("photo_order", { ascending: true });

  const defects = inspection.qc_defects ?? [];
  const inspected = inspection.qty_inspected || 0;

  const sumByType = (type: string) =>
    defects
      .filter((d: any) => d.defect_type?.toLowerCase().includes(type))
      .reduce((sum: number, d: any) => sum + (d.defect_quantity || 0), 0);

  const critical = sumByType("critical");
  const major = sumByType("major");
  const minor = sumByType("minor");
  const totalDefects = critical + major + minor;

  const pct = (n: number) =>
    inspected ? Math.round((n / inspected) * 100) : 0;

  return (
    <div className="p-6 space-y-8">
      <div className="flex gap-4 text-sm">
        <Link href="/qc" className="text-blue-600 hover:underline">
          ← Back to inspections
        </Link>

        <Link href="/" className="text-gray-600 hover:underline">
          Home
        </Link>

        <Link
          href={`/api/qc/inspections/${params.id}/report`}
          className="text-blue-600 hover:underline"
        >
          Download PDF →
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          QC Inspection – {inspection.po_number}
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          {inspection.inspection_type || "Inspection type not specified"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Report</div>
          <div className="font-semibold">
            {inspection.report_number || "—"}
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Inspection Type</div>
          <div className="font-semibold">
            {inspection.inspection_type || "—"}
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Inspector</div>
          <div className="font-semibold">
            {inspection.inspector || "—"}
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Date</div>
          <div className="font-semibold">
            {formatDate(inspection.inspection_date)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Customer</div>
          <div className="font-semibold">{inspection.customer || "—"}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Season</div>
          <div className="font-semibold">{inspection.season || "—"}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Factory</div>
          <div className="font-semibold">{inspection.factory || "—"}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Style</div>
          <div className="font-semibold">{inspection.style || "—"}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs text-gray-500">Color</div>
          <div className="font-semibold">{inspection.color || "—"}</div>
        </div>
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="font-semibold">Inspection Summary</div>

        <div className="text-sm">
          Inspected: <b>{inspected}</b> pairs — Total defects:{" "}
          <b>{totalDefects}</b> ({pct(totalDefects)}%)
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded bg-red-50 px-3 py-1 text-red-700">
            Critical: <b>{critical}</b>
          </span>

          <span className="rounded bg-orange-50 px-3 py-1 text-orange-700">
            Major: <b>{major}</b>
          </span>

          <span className="rounded bg-yellow-50 px-3 py-1 text-yellow-700">
            Minor: <b>{minor}</b>
          </span>
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2">PPS / Style View</div>

        {ppsPhotos?.length ? (
          <div className="flex flex-wrap gap-3">
            {ppsPhotos.map((p: any) => (
              <Image
                key={p.id}
                src={p.photo_url}
                alt={p.photo_name || "PPS"}
                width={120}
                height={120}
                className="rounded border object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No PPS images</div>
        )}
      </div>

      <div className="space-y-6">
        <div className="font-semibold">Defects</div>

        {defects.length > 0 ? (
          sortDefects(defects).map((defect: any) => (
            <DefectBlock
              key={defect.id}
              defect={defect}
              inspectionId={inspection.id}
            />
          ))
        ) : (
          <div className="rounded border p-4 text-sm text-gray-500">
            No defects registered for this inspection.
          </div>
        )}
      </div>
    </div>
  );
}