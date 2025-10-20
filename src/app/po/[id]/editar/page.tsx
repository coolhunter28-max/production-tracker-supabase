"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditarPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openLines, setOpenLines] = useState<number[]>([]);
  const [openSamples, setOpenSamples] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();

        // ✅ CORRECCIÓN: condición revisada para evitar error TS
        const linesWithData = data?.lineas_pedido
          ?.map((l: any, i: number) =>
            Object.values(l).some(
              (v) =>
                v !== null &&
                v !== "" &&
                v !== 0 &&
                (!Array.isArray(v) || v.length > 0)
            )
              ? i
              : null
          )
          .filter((i: number | null) => i !== null) as number[];

        setOpenLines(linesWithData);

        const initialSamples: Record<number, boolean> = {};
        data?.lineas_pedido?.forEach((l: any, i: number) => {
          if (l.muestras && l.muestras.length > 0) initialSamples[i] = true;
        });

        setOpenSamples(initialSamples);
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

  if (loading) return <div className="p-6 text-gray-600">Cargando...</div>;
  if (!po) return <div className="p-6 text-red-500">No se encontró el PO</div>;

  const formatNumber = (n: number) =>
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n || 0);
  const formatMoney = (n: number) =>
    (po.currency === "EUR" ? "€ " : "$ ") +
    new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        ✏️ Editar PO {po.po || "(sin número)"}
      </h1>

      {/* CABECERA */}
      <div className="grid md:grid-cols-3 gap-4 bg-white rounded-xl shadow p-5 border border-gray-200">
        {[
          ["Season", "season"],
          ["PO", "po"],
          ["Customer", "customer"],
          ["Supplier", "supplier"],
          ["Factory", "factory"],
          ["P.I", "P.I"],
          ["PO Date", "po_date", "date"],
          ["ETD PI", "etd_pi", "date"],
          ["Booking", "booking", "date"],
          ["Closing", "closing", "date"],
          ["Shipping", "shipping_date", "date"],
          ["Inspection", "inspection", "date"],
        ].map(([label, key, type]) => (
          <label key={key} className="text-sm font-medium text-gray-700">
            {label}
            <input
              type={(type as string) || "text"}
              value={(po as any)[key] || ""}
              onChange={(e) => setPO({ ...po, [key!]: e.target.value })}
              className="mt-1 border rounded px-2 py-1 w-full"
            />
          </label>
        ))}

        <label className="text-sm font-medium text-gray-700">
          Estado Insp.
          <select
            value={po.estado_inspeccion || ""}
            onChange={(e) =>
              setPO({ ...po, estado_inspeccion: e.target.value })
            }
            className="mt-1 border rounded px-2 py-1 w-full"
          >
            <option value="">-- Seleccionar --</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="N/N">N/N</option>
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Moneda
          <select
            value={po.currency || "USD"}
            onChange={(e) => setPO({ ...po, currency: e.target.value })}
            className="mt-1 border rounded px-2 py-1 w-full"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </label>
      </div>

      {/* LÍNEAS DE PEDIDO */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          📦 Líneas de pedido
        </h2>

        {po.lineas_pedido?.map((l: any, i: number) => {
          const isOpen = openLines.includes(i);
          return (
            <div key={i} className="mb-4 border rounded-lg bg-gray-50 shadow-sm">
              <button
                onClick={() =>
                  setOpenLines((prev) =>
                    prev.includes(i)
                      ? prev.filter((x) => x !== i)
                      : [...prev, i]
                  )
                }
                className="w-full text-left p-3 flex justify-between items-center font-semibold bg-gray-100 rounded-t-lg hover:bg-gray-200"
              >
                <span>
                  {l.reference || "Nueva línea"} • {l.style || ""} • {l.color || ""}
                </span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="p-4 border-t space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {[
                      ["Ref", "reference"],
                      ["Style", "style"],
                      ["Color", "color"],
                      ["Size", "size_run"],
                      ["Category", "category"],
                      ["Channel", "channel"],
                      ["Qty", "qty", "number"],
                      ["Price", "price", "number"],
                      ["Trial U", "trial_upper", "date"],
                      ["Trial L", "trial_lasting", "date"],
                      ["Lasting", "lasting", "date"],
                      ["Finish", "finish_date", "date"],
                    ].map(([label, key, type]) => (
                      <label key={key} className="flex flex-col">
                        <span className="font-medium text-gray-600">{label}</span>
                        <input
                          type={(type as string) || "text"}
                          value={(l as any)[key] || ""}
                          onChange={(e) => {
                            const copy = [...po.lineas_pedido];
                            copy[i][key!] =
                              type === "number"
                                ? parseFloat(e.target.value) || 0
                                : e.target.value;
                            setPO({ ...po, lineas_pedido: copy });
                          }}
                          className="mt-1 border rounded px-2 py-1"
                        />
                      </label>
                    ))}
                  </div>

                  {/* MUESTRAS */}
                  <div>
                    <button
                      onClick={() =>
                        setOpenSamples((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                      className="text-sm font-semibold text-gray-700 mt-3 mb-2 flex items-center gap-2"
                    >
                      🧪 Muestras {openSamples[i] ? "▲" : "▼"}
                    </button>

                    {openSamples[i] && (
                      <div className="space-y-2">
                        {l.muestras?.map((m: any, mi: number) => (
                          <div
                            key={mi}
                            className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm bg-white border rounded p-2"
                          >
                            {/* Tipo */}
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">
                                Tipo
                              </span>
                              <select
                                value={m.tipo_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].tipo_muestra =
                                    e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              >
                                <option value="">-- Seleccionar --</option>
                                <option value="CFMs">CFMs</option>
                                <option value="Counter Sample">
                                  Counter Sample
                                </option>
                                <option value="Fitting">Fitting</option>
                                <option value="PPS">PPS</option>
                                <option value="Testing Samples">
                                  Testing Samples
                                </option>
                                <option value="Shipping Samples">
                                  Shipping Samples
                                </option>
                                <option value="N/N">N/N</option>
                              </select>
                            </label>

                            {/* Fecha */}
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">
                                Fecha
                              </span>
                              <input
                                type="date"
                                value={m.fecha_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].fecha_muestra =
                                    e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              />
                            </label>

                            {/* Estado */}
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">
                                Estado
                              </span>
                              <select
                                value={m.estado_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].estado_muestra =
                                    e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              >
                                <option value="">-- Seleccionar --</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Enviado">Enviado</option>
                                <option value="Aprobado">Aprobado</option>
                                <option value="Rechazado">Rechazado</option>
                              </select>
                            </label>

                            {/* Round */}
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">
                                Round
                              </span>
                              <input
                                type="text"
                                value={m.round || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].round =
                                    e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              />
                            </label>

                            {/* Notas */}
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">
                                Notas
                              </span>
                              <input
                                type="text"
                                value={m.notas || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].notas =
                                    e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              />
                            </label>

                            <button
                              className="text-red-500 text-sm mt-4"
                              onClick={() => {
                                const copy = [...po.lineas_pedido];
                                copy[i].muestras.splice(mi, 1);
                                setPO({ ...po, lineas_pedido: copy });
                              }}
                            >
                              ❌
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            const copy = [...po.lineas_pedido];
                            copy[i].muestras = copy[i].muestras || [];
                            copy[i].muestras.push({
                              tipo_muestra: "",
                              fecha_muestra: "",
                              estado_muestra: "Pendiente",
                              round: "",
                              notas: "",
                            });
                            setPO({ ...po, lineas_pedido: copy });
                            setOpenSamples({ ...openSamples, [i]: true });
                          }}
                          className="mt-1 border px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                        >
                          ➕ Añadir muestra
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
              trial_upper: "",
              trial_lasting: "",
              lasting: "",
              finish_date: "",
              muestras: [],
            });
            setPO({ ...po, lineas_pedido: copy });
          }}
          className="mt-2 border px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          ➕ Añadir línea
        </button>
      </div>

      {/* BOTONES */}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          💾 Guardar
        </button>
        <button
          onClick={() => router.push(`/po/${id}`)}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow text-sm"
        >
          ← Cancelar
        </button>
        <button
          onClick={eliminar}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          🗑 Eliminar PO
        </button>
      </div>
    </div>
  );
}
