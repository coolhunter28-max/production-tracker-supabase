"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditarPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();
        setPO(data);
      } catch (err) {
        console.error("❌ Error cargando PO:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPO();
  }, [id]);

  const guardar = async () => {
    try {
      const res = await fetch(`/api/po/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(po),
      });
      if (!res.ok) throw new Error("Error al guardar");
      alert("✅ PO guardado correctamente");
      router.push(`/po/${id}`);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      alert("Error al guardar");
    }
  };

  const eliminar = async () => {
    if (!confirm("¿Seguro que quieres eliminar este PO?")) return;
    try {
      const res = await fetch(`/api/po/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      alert("PO eliminado");
      router.push("/");
    } catch (err) {
      console.error("❌ Error al eliminar:", err);
      alert("Error al eliminar");
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!po) return <div>No se encontró el PO</div>;

  // 🔹 Formateo de moneda
  const formatCurrency = (value: number) => {
    if (po.currency === "EUR") {
      return `€ ${value.toFixed(2)}`;
    }
    return `$ ${value.toFixed(2)}`;
  };

  // 🔹 Totales dinámicos
  const totalPairs = po.lineas_pedido?.reduce((acc: number, l: any) => acc + (l.qty || 0), 0) || 0;
  const totalAmount =
    po.lineas_pedido?.reduce((acc: number, l: any) => acc + (l.qty || 0) * (l.price || 0), 0) || 0;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">✏️ Editar PO {po.po}</h1>

      {/* 🔹 Datos principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
<label>
          Season
          <input
            type="text"
            value={po.season || ""}
            onChange={(e) => setPO({ ...po, season: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>

        <label>
          PO
          <input
            type="text"
            value={po.po || ""}
            onChange={(e) => setPO({ ...po, po: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Customer
          <input
            type="text"
            value={po.customer || ""}
            onChange={(e) => setPO({ ...po, customer: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Supplier
          <input
            type="text"
            value={po.supplier || ""}
            onChange={(e) => setPO({ ...po, supplier: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Factory
          <input
            type="text"
            value={po.factory || ""}
            onChange={(e) => setPO({ ...po, factory: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        
        <label>
          P.I
          <input
            type="text"
            value={po.proforma_invoice || ""}
            onChange={(e) => setPO({ ...po, proforma_invoice: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          PO Date
          <input
            type="date"
            value={po.po_date || ""}
            onChange={(e) => setPO({ ...po, po_date: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          ETD PO
          <input
            type="date"
            value={po.etd_pi || ""}
            onChange={(e) => setPO({ ...po, etd_pi: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Booking
          <input
            type="date"
            value={po.booking || ""}
            onChange={(e) => setPO({ ...po, booking: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Closing
          <input
            type="date"
            value={po.closing || ""}
            onChange={(e) => setPO({ ...po, closing: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Shipping
          <input
            type="date"
            value={po.shipping_date || ""}
            onChange={(e) => setPO({ ...po, shipping_date: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Inspection
          <input
            type="date"
            value={po.inspection || ""}
            onChange={(e) => setPO({ ...po, inspection: e.target.value })}
            className="border w-full px-2 py-1"
          />
        </label>
        <label>
          Estado Insp.
          <select
            value={po.estado_inspeccion || ""}
            onChange={(e) =>
              setPO({ ...po, estado_inspeccion: e.target.value })
            }
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
            onChange={(e) => setPO({ ...po, currency: e.target.value })}
            className="border w-full px-2 py-1"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
      </div>

      {/* 🔹 Líneas de pedido agrupadas con muestras */}
      <div>
        <h2 className="text-md font-bold mb-2">📦 Líneas de pedido</h2>
        {po.lineas_pedido?.map((l: any, i: number) => (
          <div key={i} className="mb-6 border p-2 rounded bg-gray-50">
            {/* línea + totales */}
            <table className="table-auto text-xs w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th>Ref</th>
                  <th>Style</th>
                  <th>Color</th>
                  <th>Size</th>
                  <th>category</th>
		  <th>channel</th> 	
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
                  <td>
                    <input
                      value={l.reference || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].reference = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      value={l.style || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].style = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      value={l.color || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].color = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      value={l.size_run || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].size_run = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                     <input
                      value={l.category || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].category = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                  <input
                      value={l.channel || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].channel = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.qty || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].qty = parseInt(e.target.value) || 0;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={l.price || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].price = parseFloat(e.target.value) || 0;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-16"
                    />
                  </td>
                  <td className="text-right pr-2 font-semibold">
                    {formatCurrency((l.qty || 0) * (l.price || 0))}
                  </td>
                  <td>
                    <input
                      type="date"
                      value={l.trial_upper || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].trial_upper = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={l.trial_lasting || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].trial_lasting = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={l.lasting || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].lasting = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={l.finish_date || ""}
                      onChange={(e) => {
                        const copy = [...po.lineas_pedido];
                        copy[i].finish_date = e.target.value;
                        setPO({ ...po, lineas_pedido: copy });
                      }}
                      className="border px-1 w-full"
                    />
                  </td>
                  <td>
                    <button
                      className="text-red-500"
                      onClick={() => {
                        const copy = [...po.lineas_pedido];
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

            {/* Muestras por línea */}
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
                {l.muestras?.map((m: any, mi: number) => (
                  <tr key={mi} className="border-t">
                    <td>
                      <select
                        value={m.tipo_muestra || ""}
                        onChange={(e) => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras[mi].tipo_muestra = e.target.value;
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
                        <option value="N/N">N/N</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={m.fecha_muestra || ""}
                        onChange={(e) => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras[mi].fecha_muestra = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <select
                        value={m.estado_muestra || ""}
                        onChange={(e) => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras[mi].estado_muestra = e.target.value;
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
                        type="text"
                        value={m.round || ""}
                        onChange={(e) => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras[mi].round = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={m.notas || ""}
                        onChange={(e) => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras[mi].notas = e.target.value;
                          setPO({ ...po, lineas_pedido: copy });
                        }}
                        className="border px-1 w-full"
                      />
                    </td>
                    <td>
                      <button
                        className="text-red-500"
                        onClick={() => {
                          const copy = [...po.lineas_pedido];
                          copy[i].muestras.splice(mi, 1);
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
                const copy = [...po.lineas_pedido];
                copy[i].muestras = [
                  ...(copy[i].muestras || []),
                  {
                    tipo_muestra: "",
                    fecha_muestra: "",
                    estado_muestra: "",
                    round: "",
                    notas: "",
                  },
                ];
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
            const copy = [...(po.lineas_pedido || [])];
            copy.push({
              reference: "",
              style: "",
              color: "",
              size_run: "",
              qty: 0,
              price: 0,
              amount: 0,
              trial_upper: "",
              trial_lasting: "",
              lasting: "",
              finish_date: "",
              muestras: [],
            });
            setPO({ ...po, lineas_pedido: copy });
          }}
          className="mt-2 border px-2 py-1 text-xs rounded bg-gray-50"
        >
          ➕ Añadir línea
        </button>
      </div>

      {/* 🔹 Totales dinámicos */}
      <div className="p-3 bg-gray-100 rounded border text-sm font-semibold">
        📊 Total Pares: {totalPairs} · Total Importe: {formatCurrency(totalAmount)}
      </div>

      {/* 🔹 Botones */}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          💾 Guardar
        </button>
        <button
          onClick={() => router.push(`/po/${id}`)}
          className="bg-gray-300 px-3 py-1 rounded text-sm"
        >
          ← Cancelar
        </button>
        <button
          onClick={eliminar}
          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
        >
          🗑 Eliminar PO
        </button>
      </div>
    </div>
  );
}
