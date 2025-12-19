import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
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
  /* =====================================================
   * 1) INSPECTION + DEFECTS + DEFECT PHOTOS
   * ===================================================== */
  const { data: inspection, error } = await supabase
    .from("qc_inspections")
    .select(`
      *,
      qc_defects (
        *,
        qc_defect_photos (
          id,
          photo_url,
          photo_order
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !inspection) {
    return <div className="p-6">Inspection not found</div>;
  }

  /* =====================================================
   * 2) PPS PHOTOS (BY PO)
   * ===================================================== */
  const { data: ppsPhotos } = await supabase
    .from("qc_pps_photos")
    .select("id, photo_url, photo_name, photo_order")
    .eq("po_id", inspection.po_id)
    .order("photo_order", { ascending: true });

  /* =====================================================
   * 3) NORMALIZE DEFECTS (VERY IMPORTANT)
   * ===================================================== */
  const defects = inspection.qc_defects.map((defect: any) => ({
    ...defect,
    qc_defect_photos: Array.isArray(defect.qc_defect_photos)
      ? defect.qc_defect_photos.sort(
          (a: any, b: any) =>
            (a.photo_order ?? 0) - (b.photo_order ?? 0)
        )
      : [],
  }));

  return (
    <div className="p-6 space-y-8">
      {/* =====================================================
       * HEADER
       * ===================================================== */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          QC Inspection – {inspection.po_number}
        </h1>

        <div className="text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
          <div>Report: {inspection.report_number}</div>
          <div>Factory: {inspection.factory}</div>
          <div>Date: {inspection.inspection_date}</div>
          <div>Reference: {inspection.reference}</div>
          <div>Style: {inspection.style}</div>
          <div>Color: {inspection.color}</div>
          <div>Season: {inspection.season}</div>
          <div>Type: {inspection.inspection_type}</div>
        </div>
      </div>

      {/* =====================================================
       * PPS / STYLE VIEW
       * ===================================================== */}
      {ppsPhotos && ppsPhotos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">PPS / Style View</h2>

          <div className="flex gap-3 flex-wrap">
            {ppsPhotos.map((photo) => (
              <a
                key={photo.id}
                href={photo.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-24 h-24 border rounded overflow-hidden cursor-zoom-in"
                title="Open PPS image"
              >
                <Image
                  src={photo.photo_url}
                  alt={photo.photo_name || "PPS image"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
       * DEFECTS
       * ===================================================== */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Defects</h2>

        {defects.map((defect: any) => (
          <div
            key={defect.id}
            className="border rounded p-4 space-y-2"
          >
            <div className="font-semibold">
              {defect.defect_id} – {defect.defect_type}
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
    </div>
  );
}
