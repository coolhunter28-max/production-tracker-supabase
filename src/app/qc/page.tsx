import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function QCPage() {
  const { data: inspections, error } = await supabase
    .from("qc_inspections")
    .select(`
      id,
      po_number,
      report_number,
      inspection_date,
      factory,
      reference,
      style,
      color,
      aql_result,
      qc_defects ( id )
    `)
    .order("inspection_date", { ascending: false });

  if (error) {
    return <div className="p-6">Failed to load inspections</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* TOP NAV */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
      </div>

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Quality Control (QC)</h1>
        <p className="text-sm text-gray-600">
          Listado de inspecciones de calidad
        </p>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block">
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">PO</th>
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Factory</th>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-center">Defects</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>

            <tbody>
              {inspections?.map((insp: any) => (
                <tr key={insp.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{insp.inspection_date}</td>
                  <td className="px-3 py-2 font-medium">{insp.po_number}</td>
                  <td className="px-3 py-2">{insp.report_number}</td>
                  <td className="px-3 py-2">{insp.factory}</td>
                  <td className="px-3 py-2">
                    {insp.reference} / {insp.style} / {insp.color}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        insp.aql_result === "PASS"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {insp.aql_result || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {insp.qc_defects?.length ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/qc/inspections/${insp.id}`}
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

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {inspections?.map((insp: any) => (
          <Link
            key={insp.id}
            href={`/qc/inspections/${insp.id}`}
            className="block border rounded p-4 space-y-1 hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <div className="font-semibold">{insp.po_number}</div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  insp.aql_result === "PASS"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {insp.aql_result || "-"}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              {insp.reference} / {insp.style} / {insp.color}
            </div>

            <div className="text-sm text-gray-500">
              Report: {insp.report_number}
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{insp.factory}</span>
              <span>{insp.inspection_date}</span>
              <span>Defects: {insp.qc_defects?.length ?? 0}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
