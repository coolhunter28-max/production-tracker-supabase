import Link from "next/link";
import {
  getFichaClienteFilters,
  getFichaClienteRows,
  type FichaClienteRow,
  type OperationalAlertLevel,
} from "@/lib/analytics/ficha-cliente";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: {
    customer?: string;
    season?: string;
    supplier?: string;
    style?: string;
    onlyActions?: string;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function statusClass(status?: string | null) {
  if (!status) return "bg-slate-50 text-slate-400 border-slate-200";
  if (["Aprobado", "Confirmado"].includes(status)) {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (status === "Enviado") return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (status === "Rechazado") return "bg-red-50 text-red-700 border-red-200";
  if (status === "Pendiente") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function actionClass(level?: OperationalAlertLevel | null) {
  if (level === "CRITICAL") return "bg-red-50 text-red-700 border-red-200";
  if (level === "WARNING") return "bg-orange-50 text-orange-700 border-orange-200";
  if (level === "MONITOR") return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
}

function actionDot(level?: OperationalAlertLevel | null) {
  if (level === "CRITICAL") return "🔴";
  if (level === "WARNING") return "🟠";
  if (level === "MONITOR") return "🟡";
  return "🟢";
}

function qcClass(status?: string | null) {
  if (status === "QC_FAILED") return "bg-red-50 text-red-700 border-red-200";
  if (status === "QC_ISSUES") return "bg-orange-50 text-orange-700 border-orange-200";
  if (status === "QC_OK") return "bg-green-50 text-green-700 border-green-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function qcFallbackLabel(status?: string | null) {
  if (status === "QC_FAILED") return "QC Fail";
  if (status === "QC_ISSUES") return "QC Incidencias";
  if (status === "QC_OK") return "QC OK";
  return "QC Pendiente";
}

function SampleCell({ status }: { status?: string | null }) {
  const label = status ?? "N/N";

  return (
    <td className="p-1">
      <span
        className={`inline-flex min-w-20 justify-center rounded border px-2 py-1 text-xs font-medium ${statusClass(
          status
        )}`}
      >
        {label}
      </span>
    </td>
  );
}

function DateCell({ value }: { value?: string | null }) {
  return <td className="whitespace-nowrap p-2">{formatDate(value)}</td>;
}

function ActionCell({ row }: { row: FichaClienteRow }) {
  const level = row.alert.highest_alert_level ?? "OK";

  return (
    <td className="min-w-[180px] p-2">
      <div className="flex flex-col gap-1">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${actionClass(
            level
          )}`}
          title={row.alert.alert_types ?? undefined}
        >
          <span>{actionDot(level)}</span>
          <span>{row.alert.primary_action_label ?? "Sin acciones"}</span>
        </span>

        {row.alert.alert_summary ? (
          <span className="text-xs text-slate-500">{row.alert.alert_summary}</span>
        ) : null}
      </div>
    </td>
  );
}

function QCStageLink({
  id,
  label,
  report,
  status,
}: {
  id?: string | null;
  label: string;
  report?: string | null;
  status?: string | null;
}) {
  if (!id && !report) return null;

  const badge = (
    <span
      className={`inline-flex w-fit rounded border px-2 py-1 text-xs font-semibold ${qcClass(
        status
      )}`}
    >
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {id ? (
        <Link href={`/qc/inspections/${id}`} className="w-fit">
          {badge}
        </Link>
      ) : (
        badge
      )}

      {report ? <span className="text-xs text-slate-500">{report}</span> : null}
    </div>
  );
}

function QCCell({ row }: { row: FichaClienteRow }) {
  const qc = row.qc as FichaClienteRow["qc"] & {
    trial_upper_qc_id?: string | null;
    trial_upper_report_number?: string | null;
    trial_upper_qc_status?: string | null;
    trial_lasting_qc_id?: string | null;
    trial_lasting_report_number?: string | null;
    trial_lasting_qc_status?: string | null;
    assembling_qc_id?: string | null;
    assembling_report_number?: string | null;
    assembling_qc_status?: string | null;
  };

  const hasStageQC =
    qc.trial_upper_qc_id ||
    qc.trial_upper_report_number ||
    qc.trial_lasting_qc_id ||
    qc.trial_lasting_report_number ||
    qc.assembling_qc_id ||
    qc.assembling_report_number;

  if (hasStageQC) {
    return (
      <td className="min-w-[170px] p-2">
        <div className="flex flex-col gap-1">
          <QCStageLink
            id={qc.trial_upper_qc_id}
            label="QC Trial Upper"
            report={qc.trial_upper_report_number}
            status={qc.trial_upper_qc_status ?? row.qc.qc_status}
          />

          <QCStageLink
            id={qc.trial_lasting_qc_id}
            label="QC Trial Lasting"
            report={qc.trial_lasting_report_number}
            status={qc.trial_lasting_qc_status ?? row.qc.qc_status}
          />

          <QCStageLink
            id={qc.assembling_qc_id}
            label="QC Assembling"
            report={qc.assembling_report_number}
            status={qc.assembling_qc_status ?? row.qc.qc_status}
          />
        </div>
      </td>
    );
  }

  const label = qcFallbackLabel(row.qc.qc_status);

  return (
    <td className="min-w-[150px] p-2">
      <span
        className={`inline-flex w-fit rounded border px-2 py-1 text-xs font-semibold ${qcClass(
          row.qc.qc_status
        )}`}
        title={row.qc.qc_status_label ?? undefined}
      >
        {label}
      </span>
    </td>
  );
}

function totalQty(rows: FichaClienteRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.qty_total ?? 0), 0);
}

function countByLevel(rows: FichaClienteRow[], level: OperationalAlertLevel) {
  return rows.filter((row) => row.alert.highest_alert_level === level).length;
}

function countQCReports(rows: FichaClienteRow[]) {
  return rows.filter((row) => row.qc.has_qc_report).length;
}

function getPoLinks(row: FichaClienteRow) {
  const poList = row.po_list?.split(", ").filter(Boolean) ?? [];
  const poIdList = row.po_id_list?.split(", ").filter(Boolean) ?? [];

  return poList.map((po, index) => ({
    po,
    poId: poIdList[index] ?? null,
  }));
}

export default async function FichaClientePage({ searchParams }: PageProps) {
  const filters = {
    customer: searchParams?.customer || undefined,
    season: searchParams?.season || undefined,
    supplier: searchParams?.supplier || undefined,
    style: searchParams?.style || undefined,
    onlyActions: searchParams?.onlyActions === "1",
  };

  const [rows, options] = await Promise.all([
    getFichaClienteRows(filters),
    getFichaClienteFilters(),
  ]);

  const criticalCount = countByLevel(rows, "CRITICAL");
  const warningCount = countByLevel(rows, "WARNING");
  const monitorCount = countByLevel(rows, "MONITOR");
  const okCount = countByLevel(rows, "OK");
  const qcReportsCount = countQCReports(rows);

  return (
    <main className="mx-auto max-w-[1800px] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Operativa diaria</p>
          <h1 className="text-2xl font-bold">Ficha Cliente</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fotografía diaria por cliente, temporada, ETD, modelo, color,
            acciones operativas y evidencia QC.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50">
            Inicio
          </Link>
          <Link
            href="/produccion/dashboard"
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Dashboard producción
          </Link>
        </div>
      </div>

      <form className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Cliente</span>
            <select name="customer" defaultValue={filters.customer ?? ""} className="w-full rounded border px-3 py-2">
              <option value="">Todos</option>
              {options.customers.map((customer) => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Temporada</span>
            <select name="season" defaultValue={filters.season ?? ""} className="w-full rounded border px-3 py-2">
              <option value="">Todas</option>
              {options.seasons.map((season) => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Proveedor</span>
            <select name="supplier" defaultValue={filters.supplier ?? ""} className="w-full rounded border px-3 py-2">
              <option value="">Todos</option>
              {options.suppliers.map((supplier) => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Style</span>
            <input
              name="style"
              defaultValue={filters.style ?? ""}
              placeholder="Buscar style"
              className="w-full rounded border px-3 py-2"
            />
          </label>

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              name="onlyActions"
              value="1"
              defaultChecked={filters.onlyActions}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>Solo acciones</span>
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
              Aplicar
            </button>
            <Link href="/ficha-cliente" className="rounded border px-4 py-2 text-sm hover:bg-slate-50">
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      <section className="mb-6 grid gap-3 md:grid-cols-7">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Líneas</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Qty total</p>
          <p className="text-2xl font-bold">{totalQty(rows).toLocaleString("es-ES")}</p>
        </div>

        <div className="rounded-xl border bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-600">Críticas</p>
          <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
        </div>

        <div className="rounded-xl border bg-orange-50 p-4 shadow-sm">
          <p className="text-sm text-orange-600">Acciones</p>
          <p className="text-2xl font-bold text-orange-700">{warningCount}</p>
        </div>

        <div className="rounded-xl border bg-yellow-50 p-4 shadow-sm">
          <p className="text-sm text-yellow-700">Monitor</p>
          <p className="text-2xl font-bold text-yellow-800">{monitorCount}</p>
        </div>

        <div className="rounded-xl border bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-700">OK</p>
          <p className="text-2xl font-bold text-green-800">{okCount}</p>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4 shadow-sm">
          <p className="text-sm text-slate-600">QC recibidos</p>
          <p className="text-2xl font-bold text-slate-800">{qcReportsCount}</p>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[1850px] text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr className="border-b">
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">ETD PI</th>
              <th className="p-2 text-left">Acción</th>
              <th className="p-2 text-left">Próx. fecha</th>
              <th className="p-2 text-left">QC</th>
              <th className="p-2 text-left">POs</th>
              <th className="p-2 text-left">Reference</th>
              <th className="p-2 text-left">Style</th>
              <th className="p-2 text-left">Color</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-left">CFMs</th>
              <th className="p-2 text-left">Counter</th>
              <th className="p-2 text-left">Fitting</th>
              <th className="p-2 text-left">PPS</th>
              <th className="p-2 text-left">Testing</th>
              <th className="p-2 text-left">Shipping Sample</th>
              <th className="p-2 text-left">Trial U</th>
              <th className="p-2 text-left">Trial L</th>
              <th className="p-2 text-left">Lasting</th>
              <th className="p-2 text-left">Inspection</th>
              <th className="p-2 text-left">Booking</th>
              <th className="p-2 text-left">Closing</th>
              <th className="p-2 text-left">Shipping</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => {
              const poLinks = getPoLinks(row);

              return (
                <tr
                  key={`${row.customer}-${row.etd_pi}-${row.reference}-${row.style}-${row.color}-${index}`}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap p-2 font-medium">{row.customer}</td>
                  <DateCell value={row.etd_pi} />
                  <ActionCell row={row} />
                  <DateCell value={row.alert.next_alert_date} />
                  <QCCell row={row} />

                  <td className="whitespace-nowrap p-2">
                    {poLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {poLinks.map(({ po, poId }) =>
                          poId ? (
                            <Link
                              key={`${poId}-${po}`}
                              href={`/po/${poId}/editar`}
                              className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              {po}
                            </Link>
                          ) : (
                            <span key={po} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              {po}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="whitespace-nowrap p-2">{row.reference ?? "-"}</td>
                  <td className="whitespace-nowrap p-2">{row.style ?? "-"}</td>
                  <td className="whitespace-nowrap p-2">{row.color ?? "-"}</td>
                  <td className="whitespace-nowrap p-2 text-right font-semibold">
                    {Number(row.qty_total ?? 0).toLocaleString("es-ES")}
                  </td>

                  <SampleCell status={row.cfms_status} />
                  <SampleCell status={row.counters_status} />
                  <SampleCell status={row.fittings_status} />
                  <SampleCell status={row.pps_status} />
                  <SampleCell status={row.testings_status} />
                  <SampleCell status={row.shippings_status} />

                  <DateCell value={row.trial_upper} />
                  <DateCell value={row.trial_lasting} />
                  <DateCell value={row.lasting} />
                  <DateCell value={row.inspection} />
                  <DateCell value={row.booking} />
                  <DateCell value={row.closing} />
                  <DateCell value={row.shipping_date} />
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={23} className="p-6 text-center text-slate-500">
                  No hay datos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}