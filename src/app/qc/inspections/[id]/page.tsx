import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
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
   * 3) NORMALIZE DEFECTS (SAFE)
   * ===================================================== */
  const defects = inspection.qc_defects.map((defect: any) => ({
    ...defect,
    qc_defect_photos: Array.isArray(defect.qc_defect_photos)
      ? defect.qc_defect_photos.sort(
          (a: any, b: any) => (a.photo_order ?? 0) - (b.photo_order ?? 0)
        )
      : [],
  }));

  /* =====================================================
   * 4) QC SUMMARY CALCULATIONS
   * ===================================================== */
  const qtyInspected = inspection.qty_inspected || 0;

  const criticalFound = inspection.critical_found || 0;
  const majorFound = inspection.major_found || 0;
  const minorFound = inspection.minor_found || 0;

  const totalFound = criticalFound + majorFound + minorFound;

  const pct = (found: number) =>
    qtyInspected > 0 ? Math.round((found / qtyInspected) * 100) : 0;

  const totalPct = pct(totalFound);

  /* =====================================================
   * RENDER
   * ===================================================== */
  return (
    <div className="p-6 space-y-8">
      {/* NAV */}
      <div className="flex items-center gap-4">
        <Link href="/qc" className="text-sm text-blue-600 hover:underline">
          ← Back to inspections
        </Link>
        <Link href="/" className="text-sm text-gray-600 hover:underline">
          Home
        </Link>
      </div>

      {/* HEADER */}
      <div className="space-y-1">
        <div className="text-2xl font-bold">
          QC Inspection – {inspection.po_number}
        </div>

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

      {/* SUMMARY QC */}
      <div className="border rounded p-4 bg-gray-50 space-y-2">
        <div className="text-lg font-semibold">Inspection Summary</div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            Inspected: <span className="font-medium">{qtyInspected} pairs</span>
          </div>

          <div>
            Total defects:{" "}
            <span className="font-medium">
              {totalFound} ({totalPct}%)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
              Critical
            </span>
            <span>
              {criticalFound} ({pct(criticalFound)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-medium">
              Major
            </span>
            <span>
              {majorFound} ({pct(majorFound)}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs font-medium">
              Minor
            </span>
            <span>
              {minorFound} ({pct(minorFound)}%)
            </span>
          </div>
        </div>
      </div>

      {/* PPS / STYLE VIEW */}
      {ppsPhotos && ppsPhotos.length > 0 && (
        <div className="space-y-2">
          <div className="text-lg font-semibold">PPS / Style View</div>

          <div className="flex gap-3 flex-wrap">
            {ppsPhotos.map((photo: any) => (
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

      {/* DEFECTS */}
      <div className="space-y-6">
        <div className="text-lg font-semibold">Defects</div>

        {defects.map((defect: any) => (
          <div key={defect.id} className="border rounded p-4 space-y-2">
            <div className="font-semibold">
              {defect.defect_id} – {defect.defect_type}
            </div>

            <div className="text-sm text-gray-500">
              Qty: {defect.defect_quantity}
            </div>

            {defect.defect_description && (
              <div className="text-sm text-gray-700">
                <span className="font-medium">Description:</span>{" "}
                {defect.defect_description}
              </div>
            )}

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
