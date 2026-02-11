"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ModeloMini = {
  id: string;
  style: string;
  reference?: string | null;
  supplier?: string | null;
  customer?: string | null;
  factory?: string | null;
  status?: string | null;
};

type PrecioMaster = {
  id: string;
  variante_id: string;
  season: string;
  currency: string;
  buy_price: number;
  sell_price: number | null;
  valid_from: string;
  notes: string | null;
};

export default function EditarPO() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openLines, setOpenLines] = useState<number[]>([]);
  const [openSamples, setOpenSamples] = useState<{ [key: number]: boolean }>(
    {}
  );

  // MASTER
  const [modelos, setModelos] = useState<ModeloMini[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // cache: por linea -> {varianteId, price, source, error}
  const [lineMasterInfo, setLineMasterInfo] = useState<
    Record<
      number,
      {
        varianteId?: string | null;
        price?: PrecioMaster | null;
        source?: string;
        error?: string | null;
      }
    >
  >({});

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/po/${id}`);
        const data = await res.json();

        const linesWithData = (data?.lineas_pedido
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
          .filter((i: number | null) => i !== null) as number[]) || [];

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

  // Cargar modelos para dropdown
  useEffect(() => {
    const loadModelos = async () => {
      try {
        setMasterLoading(true);
        const res = await fetch("/api/master/modelos-mini");
        const json = await res.json();
        setModelos(Array.isArray(json?.items) ? json.items : []);
      } catch (e) {
        console.error("❌ Error cargando modelos:", e);
      } finally {
        setMasterLoading(false);
      }
    };
    loadModelos();
  }, []);

  const modelosById = useMemo(() => {
    const m = new Map<string, ModeloMini>();
    modelos.forEach((x) => m.set(x.id, x));
    return m;
  }, [modelos]);

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

  // --- helpers master (resolver variante + precio) ---
  const resolveVariante = async (lineIndex: number) => {
    const l = po?.lineas_pedido?.[lineIndex];
    if (!po || !l) return;

    const modeloId = String(l.modelo_id || "").trim();
    const season = String(po.season || "").trim();
    const color = String(l.color || "").trim();
    const reference = String(l.reference || "").trim(); // ✅ CLAVE

    if (!modeloId || !season || !color) {
      setLineMasterInfo((prev) => ({
        ...prev,
        [lineIndex]: {
          varianteId: null,
          price: null,
          source: "",
          error: "Falta modelo/season/color",
        },
      }));
      return;
    }

    try {
      setLineMasterInfo((prev) => ({
        ...prev,
        [lineIndex]: { ...(prev[lineIndex] || {}), error: null },
      }));

      const res = await fetch(
        `/api/master/resolve-variante?modelo_id=${encodeURIComponent(
          modeloId
        )}&season=${encodeURIComponent(season)}&color=${encodeURIComponent(
          color
        )}&reference=${encodeURIComponent(reference)}`
      );
      const json = await res.json();
      const varianteId = json?.variante?.id || null;

      // Guardamos variante_id en la línea
      const copy = [...po.lineas_pedido];
      copy[lineIndex].variante_id = varianteId;
      setPO({ ...po, lineas_pedido: copy });

      setLineMasterInfo((prev) => ({
        ...prev,
        [lineIndex]: {
          ...(prev[lineIndex] || {}),
          varianteId,
          error: varianteId
            ? null
            : "No existe variante para ese color/season/reference",
        },
      }));

      if (!varianteId) return;

      // Ahora traemos precio recomendado
      const baseDate = po.po_date ? String(po.po_date) : ""; // si no hay, endpoint usa hoy
      const res2 = await fetch(
        `/api/master/variante-precio?variante_id=${encodeURIComponent(
          varianteId
        )}&season=${encodeURIComponent(season)}&base_date=${encodeURIComponent(
          baseDate
        )}`
      );
      const json2 = await res2.json();

      setLineMasterInfo((prev) => ({
        ...prev,
        [lineIndex]: {
          ...(prev[lineIndex] || {}),
          varianteId,
          price: json2?.price || null,
          source: json2?.source || "",
          error: json2?.price
            ? null
            : "No hay precio master para esa variante/season",
        },
      }));
    } catch (e: any) {
      setLineMasterInfo((prev) => ({
        ...prev,
        [lineIndex]: {
          varianteId: null,
          price: null,
          source: "",
          error: e?.message || "Error resolviendo master",
        },
      }));
    }
  };

  const aplicarPrecioMaster = (lineIndex: number) => {
    const info = lineMasterInfo[lineIndex];
    const price = info?.price;
    if (!price) return;

    const copy = [...po.lineas_pedido];
    // Aplicamos buy_price a price (coste)
    copy[lineIndex].price = Number(price.buy_price) || 0;

    // Si quieres también sell:
    if (price.sell_price !== null && price.sell_price !== undefined) {
      copy[lineIndex].price_selling = Number(price.sell_price) || 0;
    }

    setPO({ ...po, lineas_pedido: copy });
  };

  if (loading) return <div className="p-6 text-gray-600">Cargando...</div>;
  if (!po) return <div className="p-6 text-red-500">No se encontró el PO</div>;

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
          const info = lineMasterInfo[i];
          const modeloSel = l.modelo_id ? modelosById.get(l.modelo_id) : null;

          return (
            <div key={i} className="mb-4 border rounded-lg bg-gray-50 shadow-sm">
              <button
                onClick={() =>
                  setOpenLines((prev) =>
                    prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                  )
                }
                className="w-full text-left p-3 flex justify-between items-center font-semibold bg-gray-100 rounded-t-lg hover:bg-gray-200"
              >
                <span>
                  {l.reference || "Nueva línea"} • {l.style || ""} •{" "}
                  {l.color || ""}
                </span>
                <span>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="p-4 border-t space-y-4">
                  {/* BLOQUE MASTER */}
                  <div className="border rounded-lg bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">
                        🔗 Master (Modelo/Variante/Precio)
                      </div>
                      <div className="text-xs text-gray-500">
                        {masterLoading
                          ? "Cargando modelos…"
                          : `${modelos.length} modelos`}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 text-sm">
                      {/* Modelo */}
                      <label className="flex flex-col">
                        <span className="font-medium text-gray-600">Modelo</span>
                        <select
                          value={l.modelo_id || ""}
                          onChange={(e) => {
                            const copy = [...po.lineas_pedido];
                            copy[i].modelo_id = e.target.value || null;

                            const mm = modelosById.get(e.target.value);
                            if (mm?.style) copy[i].style = mm.style;

                            // al cambiar modelo, borramos variante
                            copy[i].variante_id = null;

                            setPO({ ...po, lineas_pedido: copy });

                            setTimeout(() => resolveVariante(i), 0);
                          }}
                          className="mt-1 border rounded px-2 py-1"
                        >
                          <option value="">-- Seleccionar modelo --</option>
                          {modelos.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.style}
                            </option>
                          ))}
                        </select>
                        {modeloSel ? (
                          <span className="text-xs text-gray-500 mt-1">
                            {modeloSel.customer || "-"} ·{" "}
                            {modeloSel.supplier || "-"} ·{" "}
                            {modeloSel.factory || "-"}
                          </span>
                        ) : null}
                      </label>

                      {/* Variante (auto) */}
                      <label className="flex flex-col">
                        <span className="font-medium text-gray-600">
                          Variante (auto)
                        </span>
                        <input
                          readOnly
                          value={l.variante_id ? "✅ asignada" : "—"}
                          className="mt-1 border rounded px-2 py-1 bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => resolveVariante(i)}
                          className="mt-2 text-xs border px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        >
                          🔄 Recalcular variante/precio
                        </button>
                      </label>

                      {/* Precio master recomendado */}
                      <label className="flex flex-col">
                        <span className="font-medium text-gray-600">
                          Precio master recomendado
                        </span>
                        <input
                          readOnly
                          value={
                            info?.price
                              ? `${info.price.buy_price} ${info.price.currency} (from ${info.price.valid_from})`
                              : "—"
                          }
                          className="mt-1 border rounded px-2 py-1 bg-gray-50"
                        />
                        <span className="text-xs text-gray-500 mt-1">
                          {info?.source ? `source: ${info.source}` : ""}
                        </span>
                      </label>

                      {/* Aplicar */}
                      <label className="flex flex-col">
                        <span className="font-medium text-gray-600">Aplicar</span>
                        <button
                          type="button"
                          disabled={!info?.price}
                          onClick={() => aplicarPrecioMaster(i)}
                          className={`mt-1 px-3 py-2 rounded text-sm ${
                            info?.price
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          Aplicar precio master
                        </button>
                        {info?.error ? (
                          <span className="text-xs text-red-600 mt-2">
                            {info.error}
                          </span>
                        ) : null}
                      </label>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Al guardar, la línea quedará enlazada a master por{" "}
                      <b>modelo_id</b> y <b>variante_id</b>. El botón “Aplicar”
                      solo te rellena el campo <b>price</b> (y opcionalmente sell).
                    </div>
                  </div>

                  {/* CAMPOS DE LINEA */}
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

                            // ✅ si cambia COLOR o REF recalculamos master
                            if (
                              (key === "color" || key === "reference") &&
                              copy[i].modelo_id
                            ) {
                              setTimeout(() => resolveVariante(i), 0);
                            }
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
                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">Tipo</span>
                              <select
                                value={m.tipo_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].tipo_muestra = e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
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
                            </label>

                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">Fecha</span>
                              <input
                                type="date"
                                value={m.fecha_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].fecha_muestra = e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              />
                            </label>

                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">Estado</span>
                              <select
                                value={m.estado_muestra || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].estado_muestra = e.target.value;
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

                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">Round</span>
                              <input
                                type="text"
                                value={m.round || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].round = e.target.value;
                                  setPO({ ...po, lineas_pedido: copy });
                                }}
                                className="mt-1 border rounded px-2 py-1"
                              />
                            </label>

                            <label className="flex flex-col">
                              <span className="font-medium text-gray-600">Notas</span>
                              <input
                                type="text"
                                value={m.notas || ""}
                                onChange={(e) => {
                                  const copy = [...po.lineas_pedido];
                                  copy[i].muestras[mi].notas = e.target.value;
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
              modelo_id: null,
              variante_id: null,
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
