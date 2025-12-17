import { createClient } from "@supabase/supabase-js";
import { DefectImageGrid } from "@/components/qc/DefectImageGrid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        qc_defect_photos (*)
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !inspection) {
    return <div className="p-6">Inspection not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        QC Inspection – {inspection.po_number}
      </h1>

      {inspection.qc_defects.map((defect: any) => (
        <div
          key={defect.id}
          className="border rounded p-4 space-y-2"
        >
          <div className="font-semibold">
            Defect – {defect.defect_type}
          </div>

          <div className="text-sm text-gray-500">
            Qty: {defect.defect_quantity}
          </div>

          <DefectImageGrid
            images={defect.qc_defect_photos}
            inspectionId={inspection.id}
            defectId={defect.id}
          />
        </div>
      ))}
    </div>
  );
}
