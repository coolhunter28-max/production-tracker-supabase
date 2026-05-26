"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Muestra = {
  id?: string;
  tipo_muestra?: string;
  fecha_muestra?: string | null;
  estado_muestra?: string | null;
  round?: number | null;
  notas?: string | null;
};

type LineaPedido = {
  id?: string;
  reference?: string | null;
  style?: string | null;
  color?: string | null;
  size_run?: string | null;
  category?: string | null;
  channel?: string | null;
  qty?: number | null;
  price?: number | null;
  price_selling?: number | null;
  amount_selling?: number | null;
  pi_bsg?: string | null;
  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;
  modelo_id?: string | null;
  variante_id?: string | null;
  muestras?: Muestra[];
};

type POData = {
  id?: string;
  po?: string | null;
  season?: string | null;
  customer?: string | null;
  supplier?: string | null;
  factory?: string | null;
  currency?: string | null;
  po_date?: string | null;
  etd_pi?: string | null;
  booking?: string | null;
  closing?: string | null;
  shipping_date?: string | null;
  inspection?: string | null;
  estado_inspeccion?: string | null;
  lineas_pedido?: LineaPedido[];
};

function safeNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function EditarPOPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = params?.id;

  const [po, setPO] = useState<POData>({
    currency: "USD",
    lineas_pedido: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPO() {
    try {
      setLoading(true);

      const res = await fetch(`/api/po/${id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      setPO({
        ...data,
        currency: data.currency || "USD",
        lineas_pedido: Array.isArray(data.lineas_pedido)
          ? data.lineas_pedido
          : [],
      });
    } catch (err) {
      console.error(err);
      alert("❌ Error cargando PO");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPO();
  }, [id]);

  const totalPairs = useMemo(() => {
    return (po.lineas_pedido ?? []).reduce(
      (acc, line) => acc + (safeNum(line.qty) || 0),
      0,
    );
  }, [po.lineas_pedido]);

  const totalAmount = useMemo(() => {
    return (po.lineas_pedido ?? []).reduce((acc, line) => {
      return acc + (safeNum(line.qty) || 0) * (safeNum(line.price) || 0);
    }, 0);
  }, [po.lineas_pedido]);

  function updatePOField<K extends keyof POData>(
    key: K,
    value: POData[K],
  ) {
    setPO((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateLinea(
    index: number,
    patch: Partial<LineaPedido>,
  ) {
    setPO((prev) => ({
      ...prev,
      lineas_pedido: (prev.lineas_pedido ?? []).map((linea, i) =>
        i === index ? { ...linea, ...patch } : linea,
      ),
    }));
  }

  function updateMuestra(
    lineaIndex: number,
    muestraIndex: number,
    patch: Partial<Muestra>,
  ) {
    setPO((prev) => ({
      ...prev,
      lineas_pedido: (prev.lineas_pedido ?? []).map((linea, li) => {
        if (li !== lineaIndex) return linea;

        return {
          ...linea,
          muestras: (linea.muestras ?? []).map((m, mi) =>
            mi === muestraIndex ? { ...m, ...patch } : m,
          ),
        };
      }),
    }));
  }

  async function guardar() {
    try {
      setSaving(true);

      const payload = {
        ...po,
        lineas_pedido: (po.lineas_pedido ?? []).map((linea) => ({
          ...linea,
          qty: safeNum(linea.qty),
          price: safeNum(linea.price),
          price_selling: safeNum(linea.price_selling),
          amount_selling: safeNum(linea.amount_selling),
        })),
      };

      const res = await fetch(`/api/po/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "Error guardando");
      }

      alert("✅ PO guardado correctamente");

      await loadPO();
    } catch (err: any) {
      console.error(err);
      alert(`❌ ${err?.message || "Error guardando"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-xl border bg-white p-6">
          Cargando PO...
        </div>
      </main>
    );
  }
  async function eliminarPO() {
    const ok = confirm(
      "⚠️ Vas a eliminar este PO y sus líneas asociadas. ¿Seguro que quieres continuar?",
    );
  
    if (!ok) return;
  
    try {
      const res = await fetch(`/api/po/${id}`, {
        method: "DELETE",
      });
  
      const json = await res.json();
  
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "Error eliminando PO");
      }
  
      alert("🗑️ PO eliminado correctamente");
      router.push("/produccion/dashboard");
    } catch (err: any) {
      console.error(err);
      alert(`❌ ${err?.message || "Error eliminando PO"}`);
    }
  }
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          ✏️ Editar PO
        </h1>

        <div className="flex gap-2">
  <button
    onClick={guardar}
    disabled={saving}
    className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
    type="button"
  >
    {saving ? "Guardando..." : "💾 Guardar"}
  </button>

  <button
    onClick={eliminarPO}
    className="rounded bg-red-600 px-4 py-2 text-sm text-white"
    type="button"
  >
    🗑️ Eliminar
  </button>

  <button
    onClick={() => router.back()}
    className="rounded bg-gray-200 px-4 py-2 text-sm"
    type="button"
  >
    ← Cancelar
  </button>
</div>
      </div>

      <section className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-4">
        <Input
          label="PO"
          value={po.po ?? ""}
          onChange={(v) => updatePOField("po", v)}
        />

        <Input
          label="Season"
          value={po.season ?? ""}
          onChange={(v) => updatePOField("season", v)}
        />

        <Input
          label="Customer"
          value={po.customer ?? ""}
          onChange={(v) => updatePOField("customer", v)}
        />

        <Input
          label="Supplier"
          value={po.supplier ?? ""}
          onChange={(v) => updatePOField("supplier", v)}
        />

        <Input
          label="Factory"
          value={po.factory ?? ""}
          onChange={(v) => updatePOField("factory", v)}
        />

        <Input
          label="Currency"
          value={po.currency ?? ""}
          onChange={(v) => updatePOField("currency", v)}
        />

        <Input
          label="PO Date"
          type="date"
          value={toInputDate(po.po_date)}
          onChange={(v) => updatePOField("po_date", v)}
        />

        <Input
          label="ETD PI"
          type="date"
          value={toInputDate(po.etd_pi)}
          onChange={(v) => updatePOField("etd_pi", v)}
        />

        <Input
          label="Booking"
          type="date"
          value={toInputDate(po.booking)}
          onChange={(v) => updatePOField("booking", v)}
        />

        <Input
          label="Closing"
          type="date"
          value={toInputDate(po.closing)}
          onChange={(v) => updatePOField("closing", v)}
        />

        <Input
          label="Shipping"
          type="date"
          value={toInputDate(po.shipping_date)}
          onChange={(v) => updatePOField("shipping_date", v)}
        />

        <Input
          label="Inspection"
          type="date"
          value={toInputDate(po.inspection)}
          onChange={(v) => updatePOField("inspection", v)}
        />
      </section>

      <div className="rounded-xl border bg-gray-50 p-4 font-semibold">
        📊 Total Pares: {totalPairs.toLocaleString("es-ES")} · Total Importe:{" "}
        {formatCurrency(totalAmount, po.currency || "USD")}
      </div>

      <section className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">
          Líneas de pedido
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="p-2">Ref</th>
                <th className="p-2">Style</th>
                <th className="p-2">Color</th>
                <th className="p-2">Size</th>
                <th className="p-2">Category</th>
                <th className="p-2">Channel</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Price</th>
                <th className="p-2">Selling</th>
                <th className="p-2">Trial U</th>
                <th className="p-2">Trial L</th>
                <th className="p-2">Lasting</th>
                <th className="p-2">Finish</th>
              </tr>
            </thead>

            <tbody>
              {(po.lineas_pedido ?? []).map((linea, index) => (
                <tr key={linea.id ?? index} className="border-b">
                  <td className="p-2">
                    <CellInput
                      value={linea.reference ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          reference: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      value={linea.style ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          style: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      value={linea.color ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          color: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      value={linea.size_run ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          size_run: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      value={linea.category ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          category: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      value={linea.channel ?? ""}
                      onChange={(v) =>
                        updateLinea(index, {
                          channel: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="number"
                      value={String(linea.qty ?? "")}
                      onChange={(v) =>
                        updateLinea(index, {
                          qty: safeNum(v),
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="number"
                      value={String(linea.price ?? "")}
                      onChange={(v) =>
                        updateLinea(index, {
                          price: safeNum(v),
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="number"
                      value={String(linea.price_selling ?? "")}
                      onChange={(v) =>
                        updateLinea(index, {
                          price_selling: safeNum(v),
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="date"
                      value={toInputDate(linea.trial_upper)}
                      onChange={(v) =>
                        updateLinea(index, {
                          trial_upper: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="date"
                      value={toInputDate(linea.trial_lasting)}
                      onChange={(v) =>
                        updateLinea(index, {
                          trial_lasting: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="date"
                      value={toInputDate(linea.lasting)}
                      onChange={(v) =>
                        updateLinea(index, {
                          lasting: v,
                        })
                      }
                    />
                  </td>

                  <td className="p-2">
                    <CellInput
                      type="date"
                      value={toInputDate(linea.finish_date)}
                      onChange={(v) =>
                        updateLinea(index, {
                          finish_date: v,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">
          🧪 Muestras
        </h2>

        {(po.lineas_pedido ?? []).map((linea, lineaIndex) => (
          <div
            key={`muestras-${linea.id ?? lineaIndex}`}
            className="rounded-lg border p-4"
          >
            <div className="mb-3 font-semibold">
              {(linea.color ?? "-")} ({linea.style ?? "-"})
            </div>

            <div className="space-y-2">
              {(linea.muestras ?? []).map(
                (muestra, muestraIndex) => (
                  <div
                    key={muestra.id ?? muestraIndex}
                    className="grid gap-2 md:grid-cols-5"
                  >
                    <CellInput
                      value={muestra.tipo_muestra ?? ""}
                      onChange={(v) =>
                        updateMuestra(
                          lineaIndex,
                          muestraIndex,
                          {
                            tipo_muestra: v,
                          },
                        )
                      }
                    />

                    <CellInput
                      type="date"
                      value={toInputDate(
                        muestra.fecha_muestra,
                      )}
                      onChange={(v) =>
                        updateMuestra(
                          lineaIndex,
                          muestraIndex,
                          {
                            fecha_muestra: v,
                          },
                        )
                      }
                    />

                    <CellInput
                      value={muestra.estado_muestra ?? ""}
                      onChange={(v) =>
                        updateMuestra(
                          lineaIndex,
                          muestraIndex,
                          {
                            estado_muestra: v,
                          },
                        )
                      }
                    />

                    <CellInput
                      value={String(muestra.round ?? "")}
                      onChange={(v) =>
                        updateMuestra(
                          lineaIndex,
                          muestraIndex,
                          {
                            round: safeNum(v),
                          },
                        )
                      }
                    />

                    <CellInput
                      value={muestra.notas ?? ""}
                      onChange={(v) =>
                        updateMuestra(
                          lineaIndex,
                          muestraIndex,
                          {
                            notas: v,
                          },
                        )
                      }
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border px-3 text-sm"
      />
    </label>
  );
}

function CellInput({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded border px-2 text-sm"
    />
  );
}