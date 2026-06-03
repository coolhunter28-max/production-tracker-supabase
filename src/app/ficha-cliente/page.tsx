import Link from "next/link";
import {
  getFichaClienteFilters,
  getFichaClienteRows,
  type FichaClienteRow,
} from "@/lib/analytics/ficha-cliente";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: {
    customer?: string;
    season?: string;
    supplier?: string;
    style?: string;
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
  
    if (status === "Enviado") {
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    }
  
    if (status === "Rechazado") {
      return "bg-red-50 text-red-700 border-red-200";
    }
  
    if (status === "Pendiente") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
  
    return "bg-slate-50 text-slate-500 border-slate-200";
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

function totalQty(rows: FichaClienteRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.qty_total ?? 0), 0);
}

function getPoLinks(row: FichaClienteRow & { po_id_list?: string | null }) {
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
  };

  const [rows, options] = await Promise.all([
    getFichaClienteRows(filters),
    getFichaClienteFilters(),
  ]);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Operativa diaria</p>
          <h1 className="text-2xl font-bold">Ficha Cliente</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fotografía diaria por cliente, temporada y proveedor.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
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
        <div className="grid gap-3 md:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Cliente</span>
            <select
              name="customer"
              defaultValue={filters.customer ?? ""}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Todos</option>
              {options.customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Temporada</span>
            <select
              name="season"
              defaultValue={filters.season ?? ""}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Todas</option>
              {options.seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Proveedor</span>
            <select
              name="supplier"
              defaultValue={filters.supplier ?? ""}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Todos</option>
              {options.suppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
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

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Aplicar
            </button>
            <Link
              href="/ficha-cliente"
              className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Líneas</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Qty total</p>
          <p className="text-2xl font-bold">
            {totalQty(rows).toLocaleString("es-ES")}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cliente</p>
          <p className="text-xl font-bold">{filters.customer ?? "Todos"}</p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Temporada</p>
          <p className="text-xl font-bold">{filters.season ?? "Todas"}</p>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[1500px] text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr className="border-b">
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">ETD PI</th>
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
                  <td className="whitespace-nowrap p-2 font-medium">
                    {row.customer}
                  </td>

                  <DateCell value={row.etd_pi} />

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
                            <span
                              key={po}
                              className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            >
                              {po}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="whitespace-nowrap p-2">
                    {row.reference ?? "-"}
                  </td>
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
                <td colSpan={20} className="p-6 text-center text-slate-500">
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