"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TMuestra = {
  tipo_muestra?: string;
  fecha_muestra?: string;
  estado_muestra?: string;
  round?: string | number;
  notas?: string;
};

type TLinea = {
  reference?: string;
  style?: string;
  color?: string;
  size_run?: string;
  category?: string;
  channel?: string;
  qty?: number;
  price?: number;
  trial_upper?: string;
  trial_lasting?: string;
  lasting?: string;
  finish_date?: string;
  muestras?: TMuestra[];
};

type TPO = {
  season?: string;
  po?: string;
  customer?: string;
  supplier?: string;
  factory?: string;
  proforma_invoice?: string;
  po_date?: string;
  etd_pi?: string;
  booking?: string;
  closing?: string;
  shipping_date?: string;
  inspection?: string;
  estado_inspeccion?: string;
  currency?: "USD" | "EUR";
  lineas_pedido?: TLinea[];
};

export default function NuevoPO() {
  const router = useRouter();
  const [po, setPO] = useState<TPO>({
    currency: "USD",
    lineas_pedido: [],
  });

  // ✅ Formato español (punto para miles, coma para decimales)
  const fmt = (v: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: po.currency || "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const totalPairs = useMemo(
    () => (po.lineas_pedido ?? []).reduce((a, l) => a + (l.qty || 0), 0),
    [po]
  );
  const totalAmount = useMemo(
    () => (po.lineas_pedido ?? []).reduce((a, l) => a + (l.qty || 0) * (l.price || 0), 0),
    [po]
  );

  const guardar = async () => {
    try {
      const res = await fetch("/api/po/nuevo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(po),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      alert("✅ PO creado correctamente");
      router.push(`/po/${data.id}/editar`);
    } catch (err) {
      console.error("❌ Error creando PO:", err);
      alert("Error al crear PO");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">➕ Crear nuevo PO</h1>

      {/* Cabecera */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {[
          ["Season", "season"],
          ["PO", "po"],
          ["Customer", "customer"],
          ["Supplier", "supplier"],
          ["Factory", "factory"],
          ["P.I", "proforma_invoice"],
          ["PO Date", "po_date", "date"],
          ["ETD PO", "etd_pi", "date"],
          ["Booking", "booking", "date"],
          ["Closing", "closing", "date"],
          ["Shipping", "shipping_date", "date"],
          ["Inspection", "inspection", "date"],
        ].map(([label, key, type]) => (
          <label key={key}>
            {label}
            <input
              type={type || "text"}
              value={(po as any)[key] || ""}
              onChange={(e) => setPO({ ...po, [key!]: e.target.value })}
              className="border w-full px-2 py-1"
            />
          </label>
        ))}

        <label>
          Estado Insp.
          <select
            value={po.estado_inspeccion || ""}
            onChange={(e) => setPO({ ...po, estado_inspeccion: e.target.value })}
            className="border w-full px-2 py-1"
          >
            <option value="">-- Seleccionar --</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="N/N">N/N</option>
          </select>
        </label>

        <label>
          Moneda
          <select
            value={po.currency || "USD"}
            onChange={(e) => setPO({ ...po, currency: e.target.value as "USD" | "EUR" })}
            className="border w-full px-2 py-1"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
      </div>

      {/* Líneas */}
      <div>
        <h2 className="text-md font-bold mb-2">📦 Líneas de pedido</h2>

        {(po.lineas_pedido ?? []).map((l, i) => (
          <div key={i} className="mb-6 border p-2 rounded bg-gray-50">
            <table className="table-auto text-xs w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th>Ref</th>
                  <th>Style</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>Category</th>
                  <th>Channel</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Trial U</th>
                  <th>Trial L</th>
                  <th>Lasting</th>
                  <th>Finish</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  {(["reference", "style", "color", "size_run", "category", "channel"] as const).map(
                    (k) => (
                      <td key={k}>
                        <input
                          value={(l as any)[k] || ""}
                          onChange={(e) => {
                            const copy = [...(po.lineas_pedido ?? [])];
                            (copy[i] as any)[k] = e.target.value;
                            setPO({ ...po, lineas_pedido: copy });
                          }}
                          className="border px-1 w-full"
                        />
                      </td>
                    )
                  )}

                  {/* Qty */}
                  <td>
                    <input
                      type="number"
                      value={l.qty ?? ""}
                      onChange={(e) => {
                        const copy = [...(po.lineas_pedido ?? [])];
                        copy[i].qty = parseFloat(e.target.value) || 0;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full text-right"
                    />
                  </td>

                  {/* Price */}
                  <td>
                    <div className="flex items-center border px-1 rounded w-full">
                      <span className="text-gray-500 mr-1">
                        {po.currency === "EUR" ? "€" : "$"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={l.price ?? ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          copy[i].price = parseFloat(e.target.value) || 0;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="w-full text-right outline-none"
                      />
                    </div>
                  </td>

                  {/* Total */}
                  <td className="border text-right font-semibold px-2 whitespace-nowrap">
                    {fmt((l.qty || 0) * (l.price || 0))}
                  </td>

                  {/* Fechas */}
                  {(["trial_upper", "trial_lasting", "lasting", "finish_date"] as const).map((k) => (
                    <td key={k}>
                      <input
                        type="date"
                        value={(l as any)[k] || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i] as any)[k] = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                  ))}

                  <td>
                    <button
                      className="text-red-500"
                      onClick={() => {
                        const copy = [...(po.lineas_pedido ?? [])];
                        copy.splice(i, 1);
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Muestras */}
            <h3 className="font-semibold mt-2">🧪 Muestras de {l.reference}</h3>
            <table className="table-auto text-xs w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Round</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(l.muestras ?? []).map((m, mi) => (
                  <tr key={mi}>
                    <td>
                      <select
                        value={m.tipo_muestra || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= [])[mi].tipo_muestra = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      >
                        <option value="">-- Seleccionar --</option>
                        <option value="CFMs">CFMs</option>
                        <option value="Counter Sample">Counter Sample</option>
                        <option value="Fitting">Fitting</option>
                        <option value="PPS">PPS</option>
                        <option value="Testing Samples">Testing Samples</option>
                        <option value="Shipping Samples">Shipping Samples</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={m.fecha_muestra || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= [])[mi].fecha_muestra = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <select
                        value={m.estado_muestra || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= [])[mi].estado_muestra = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      >
                        <option value="">-- Seleccionar --</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Rechazado">Rechazado</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={m.round || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= [])[mi].round = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <input
                        value={m.notas || ""}
                        onChange={(e) => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= [])[mi].notas = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <button
                        className="text-red-500"
                        onClick={() => {
                          const copy = [...(po.lineas_pedido ?? [])];
                          (copy[i].muestras ??= []).splice(mi, 1);
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => {
                const copy = [...(po.lineas_pedido ?? [])];
                (copy[i].muestras ??= []).push({
                  tipo_muestra: "",
                  fecha_muestra: "",
                  estado_muestra: "",
                  round: "",
                  notas: "",
                });
                setPO({ ...po, lineas_pedido: copy });
              }}
              className="mt-2 border px-2 py-1 text-xs rounded bg-gray-50"
            >
              ➕ Añadir muestra
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            const copy = [...(po.lineas_pedido ?? [])];
            copy.push({ qty: 0, price: 0, muestras: [] });
            setPO({ ...po, lineas_pedido: copy });
          }}
          className="mt-2 border px-2 py-1 text-xs rounded bg-gray-50"
        >
          ➕ Añadir línea
        </button>
      </div>

      {/* Totales */}
      <div className="p-3 bg-gray-100 rounded border text-sm font-semibold">
        📊 Total Pares: {totalPairs.toLocaleString("es-ES")} · Total Importe: {fmt(totalAmount)}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button onClick={guardar} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          💾 Guardar
        </button>
        <button onClick={() => router.push("/")} className="bg-gray-300 px-3 py-1 rounded text-sm">
          ← Cancelar
        </button>
      </div>
    </div>
  );
}
