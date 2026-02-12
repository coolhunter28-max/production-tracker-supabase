"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TModelo = {
  id: string;
  style: string;
  customer: string | null;
  supplier: string | null;
  factory: string | null;
  reference: string | null;
  status: string | null;
};

type TVariante = {
  id: string;
  modelo_id: string;
  season: string;
  color: string | null;
  reference: string | null;
  factory: string | null;
  status: string | null;
};

type TMasterPrecio = {
  id: string;
  variante_id: string;
  season: string;
  currency: string;
  buy_price: number;
  sell_price: number | null;
  valid_from: string;
  notes: string | null;
};

type TMuestra = {
  id?: string;
  tipo_muestra?: string;
  fecha_muestra?: string;
  estado_muestra?: string;
  round?: string | number;
  notas?: string;
  fecha_teorica?: string | null;
};

type TLinea = {
  id?: string;

  modelo_id?: string | null;
  variante_id?: string | null;

  reference?: string;
  style?: string;
  color?: string;
  size_run?: string;
  category?: string;
  channel?: string;

  qty?: number;
  price?: number;

  price_selling?: number | null;
  amount_selling?: number | null;
  pi_bsg?: string | null;

  trial_upper?: string | null;
  trial_lasting?: string | null;
  lasting?: string | null;
  finish_date?: string | null;

  muestras?: TMuestra[];

  // UI helpers
  variantes?: TVariante[];
  master_price?: TMasterPrecio | null;
  master_price_status?: "idle" | "loading" | "ok" | "none" | "error";
  master_price_error?: string | null;
};

type TPO = {
  id?: string;

  season?: string;
  po?: string;
  customer?: string;
  supplier?: string;
  factory?: string;

  pi?: string | null;
  proforma_invoice?: string | null;

  po_date?: string | null;
  etd_pi?: string | null;
  booking?: string | null;
  closing?: string | null;
  shipping_date?: string | null;
  inspection?: string | null;

  estado_inspeccion?: string | null;
  currency?: "USD" | "EUR";
  channel?: string | null;

  lineas_pedido?: TLinea[];
};

type TSuggestions = {
  customers: string[];
  suppliers: string[];
  factories: string[];
  sizes: string[];
  categories: string[];
  channels: string[];
};

function toISODateOrEmpty(v: any): string {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EditarPOPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idParam = params?.id;

  const isNew = !idParam || idParam === "nuevo";

  const [po, setPO] = useState<TPO>({
    currency: "USD",
    lineas_pedido: [],
  });

  // master modelos
  const [modelos, setModelos] = useState<TModelo[]>([]);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [modelosError, setModelosError] = useState<string | null>(null);
  const [modeloQ, setModeloQ] = useState("");

  // suggestions (datalist)
  const [suggestions, setSuggestions] = useState<TSuggestions>({
    customers: [],
    suppliers: [],
    factories: [],
    sizes: [],
    categories: [],
    channels: [],
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const poDateISO = useMemo(() => toISODateOrEmpty(po.po_date), [po.po_date]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: po.currency || "USD",
      minimumFractionDigits: 2,
    }).format(v);

  const totalPairs = useMemo(
    () => (po.lineas_pedido ?? []).reduce((a, l) => a + (l.qty || 0), 0),
    [po.lineas_pedido]
  );

  const totalAmount = useMemo(
    () => (po.lineas_pedido ?? []).reduce((a, l) => a + (l.qty || 0) * (l.price || 0), 0),
    [po.lineas_pedido]
  );

  // ------------------ LOAD PO (solo editar) ------------------
  const loadPO = async () => {
    if (isNew) return;

    const poId = idParam!;
    const res = await fetch(`/api/po/${poId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Error cargando PO");

    const normalized: TPO = {
      ...json,
      proforma_invoice: json?.proforma_invoice ?? json?.pi ?? null,
      pi: json?.pi ?? json?.proforma_invoice ?? null,
      lineas_pedido: Array.isArray(json?.lineas_pedido) ? json.lineas_pedido : [],
    };

    normalized.lineas_pedido = (normalized.lineas_pedido || []).map((l: any) => ({
      ...l,
      modelo_id: l.modelo_id ?? null,
      variante_id: l.variante_id ?? null,
      variantes: [],
      master_price: null,
      master_price_status: "idle",
      master_price_error: null,
      muestras: Array.isArray(l.muestras) ? l.muestras : [],
    }));

    setPO({
      currency: "USD",
      ...normalized,
      currency: (normalized.currency as any) || "USD",
    });
  };

  useEffect(() => {
    (async () => {
      try {
        await loadPO();
      } catch (e: any) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  // ------------------ LOAD MODELOS ------------------
  const loadModelos = async () => {
    setModelosLoading(true);
    setModelosError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      params.set("offset", "0");

      const q = modeloQ.trim();
      if (q) params.set("q", q);

      const customer = (po.customer || "").trim();
      const supplier = (po.supplier || "").trim();
      const factory = (po.factory || "").trim();

      if (customer) params.set("customer", customer);
      if (supplier) params.set("supplier", supplier);
      if (factory) params.set("factory", factory);

      const res = await fetch(`/api/modelos?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando modelos");

      setModelos(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setModelos([]);
      setModelosError(e?.message || "Error");
    } finally {
      setModelosLoading(false);
    }
  };

  // ✅ DEBOUNCE modelos por filtros cabecera
  const debounceModelosRef = useRef<any>(null);
  useEffect(() => {
    if (debounceModelosRef.current) clearTimeout(debounceModelosRef.current);
    debounceModelosRef.current = setTimeout(() => {
      loadModelos();
    }, 300);

    return () => {
      if (debounceModelosRef.current) clearTimeout(debounceModelosRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po.customer, po.supplier, po.factory]);

  // ------------------ SUGGESTIONS (datalist) ------------------
  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("limit", "400");

      const customer = (po.customer || "").trim();
      const supplier = (po.supplier || "").trim();
      const factory = (po.factory || "").trim();

      if (customer) sp.set("customer", customer);
      if (supplier) sp.set("supplier", supplier);
      if (factory) sp.set("factory", factory);

      const res = await fetch(`/api/po/suggestions?${sp.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error cargando sugerencias");

      const d = json?.data || {};
      setSuggestions({
        customers: Array.isArray(d.customers) ? d.customers : [],
        suppliers: Array.isArray(d.suppliers) ? d.suppliers : [],
        factories: Array.isArray(d.factories) ? d.factories : [],
        sizes: Array.isArray(d.sizes) ? d.sizes : [],
        categories: Array.isArray(d.categories) ? d.categories : [],
        channels: Array.isArray(d.channels) ? d.channels : [],
      });
    } catch (e: any) {
      setSuggestionsError(e?.message || "Error");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // ✅ Debounce sugerencias cuando cambian los filtros cabecera
  const debounceSugRef = useRef<any>(null);
  useEffect(() => {
    if (debounceSugRef.current) clearTimeout(debounceSugRef.current);
    debounceSugRef.current = setTimeout(() => {
      loadSuggestions();
    }, 250);

    return () => {
      if (debounceSugRef.current) clearTimeout(debounceSugRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po.customer, po.supplier, po.factory]);

  // cargar sugerencias iniciales
  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------ VARIANTES por línea ------------------
  const loadVariantesForLine = async (lineIndex: number, modeloId: string) => {
    const season = (po.season || "").trim();

    if (!modeloId || !season) {
      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = { ...copy[lineIndex], variantes: [], variante_id: null };
        return { ...prev, lineas_pedido: copy };
      });
      return;
    }

    setPO((prev) => {
      const copy = [...(prev.lineas_pedido ?? [])];
      if (!copy[lineIndex]) return prev;
      copy[lineIndex] = { ...copy[lineIndex], variantes: [], variante_id: null };
      return { ...prev, lineas_pedido: copy };
    });

    try {
      const res = await fetch(
        `/api/modelos/${modeloId}/variantes?season=${encodeURIComponent(season)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando variantes");

      const variantes: TVariante[] = Array.isArray(json?.data) ? json.data : [];

      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = { ...copy[lineIndex], variantes };
        return { ...prev, lineas_pedido: copy };
      });
    } catch (e) {
      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = { ...copy[lineIndex], variantes: [] };
        return { ...prev, lineas_pedido: copy };
      });
    }
  };

  // ------------------ MASTER PRICE recomendado ------------------
  const loadMasterPriceForLine = async (lineIndex: number, varianteId: string) => {
    const season = (po.season || "").trim();

    if (!varianteId || !season) {
      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = {
          ...copy[lineIndex],
          master_price: null,
          master_price_status: "idle",
          master_price_error: null,
        };
        return { ...prev, lineas_pedido: copy };
      });
      return;
    }

    setPO((prev) => {
      const copy = [...(prev.lineas_pedido ?? [])];
      if (!copy[lineIndex]) return prev;
      copy[lineIndex] = {
        ...copy[lineIndex],
        master_price_status: "loading",
        master_price_error: null,
      };
      return { ...prev, lineas_pedido: copy };
    });

    try {
      const params = new URLSearchParams();
      params.set("varianteId", varianteId);
      params.set("season", season);
      if (poDateISO) params.set("baseDate", poDateISO);

      const res = await fetch(`/api/master/precio?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando master price");

      const mp: TMasterPrecio | null = json?.data ?? null;

      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = {
          ...copy[lineIndex],
          master_price: mp,
          master_price_status: mp ? "ok" : "none",
        };
        return { ...prev, lineas_pedido: copy };
      });
    } catch (e: any) {
      setPO((prev) => {
        const copy = [...(prev.lineas_pedido ?? [])];
        if (!copy[lineIndex]) return prev;
        copy[lineIndex] = {
          ...copy[lineIndex],
          master_price: null,
          master_price_status: "error",
          master_price_error: e?.message || "Error",
        };
        return { ...prev, lineas_pedido: copy };
      });
    }
  };

  const applyMasterPriceToLine = (lineIndex: number) => {
    setPO((prev) => {
      const copy = [...(prev.lineas_pedido ?? [])];
      const linea = copy[lineIndex];
      if (!linea?.master_price) return prev;

      const mp = linea.master_price;
      const supplier = (prev.supplier || "").toLowerCase();
      const isBSG = supplier.includes("bsg");

      const recommendedBuy = safeNum(mp.buy_price);
      const recommendedSell = safeNum(mp.sell_price);
      const qty = safeNum(linea.qty) ?? 0;

      const next = { ...linea };

      if (isBSG) {
        next.price = (recommendedBuy ?? next.price ?? 0) as number;
        next.price_selling = recommendedSell ?? next.price_selling ?? null;
        next.amount_selling =
          next.price_selling !== null
            ? Number((qty * (next.price_selling || 0)).toFixed(2))
            : null;
      } else {
        const p = recommendedSell ?? recommendedBuy;
        if (p !== null) next.price = p;
      }

      copy[lineIndex] = next;
      return { ...prev, lineas_pedido: copy };
    });
  };

  // ------------------ Guardar: POST nuevo / PUT editar ------------------
  const guardar = async () => {
    try {
      if (isNew) {
        const payload = {
          ...po,
          proforma_invoice: po.proforma_invoice ?? po.pi ?? null,
        };

        const res = await fetch("/api/po/nuevo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Error creando PO");

        alert("✅ PO creado");
        router.push(`/po/${data.id}/editar`);
      } else {
        const payload = {
          ...po,
          pi: po.pi ?? po.proforma_invoice ?? null,
        };

        const res = await fetch(`/api/po/${idParam}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Error actualizando PO");

        alert("✅ PO actualizado");
      }
    } catch (e: any) {
      console.error(e);
      alert("❌ Error guardando PO (mira consola)");
    }
  };

  const addLinea = () => {
    setPO((prev) => ({
      ...prev,
      lineas_pedido: [
        ...(prev.lineas_pedido ?? []),
        {
          qty: 0,
          price: 0,
          muestras: [],
          modelo_id: null,
          variante_id: null,
          variantes: [],
          master_price: null,
          master_price_status: "idle",
          master_price_error: null,
        },
      ],
    }));
  };

  // ------------------ RENDER ------------------
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* DATALISTS (globales) */}
      <datalist id="dl-po-customers">
        {suggestions.customers.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="dl-po-suppliers">
        {suggestions.suppliers.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="dl-po-factories">
        {suggestions.factories.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="dl-po-sizes">
        {suggestions.sizes.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="dl-po-categories">
        {suggestions.categories.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="dl-po-channels">
        {suggestions.channels.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">✏️ {isNew ? "Nuevo PO" : "Editar PO"}</h1>

        <div className="flex gap-2">
          <button onClick={guardar} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
            💾 Guardar
          </button>
          <button onClick={() => router.back()} className="bg-gray-200 px-4 py-2 rounded text-sm">
            ← Cancelar
          </button>
        </div>
      </div>

      {/* Cabecera */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <label className="space-y-1">
            <div className="text-xs text-gray-600">Season *</div>
            <input
              value={po.season || ""}
              onChange={(e) => setPO((prev) => ({ ...prev, season: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">PO *</div>
            <input
              value={po.po || ""}
              onChange={(e) => setPO((prev) => ({ ...prev, po: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">Customer</div>
            <input
              list="dl-po-customers"
              value={po.customer || ""}
              onChange={(e) => setPO((prev) => ({ ...prev, customer: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
              placeholder={suggestionsLoading ? "Cargando…" : ""}
            />
            <div className="text-[11px] text-gray-500">(filtra modelos)</div>
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">Supplier</div>
            <input
              list="dl-po-suppliers"
              value={po.supplier || ""}
              onChange={(e) => setPO((prev) => ({ ...prev, supplier: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
              placeholder={suggestionsLoading ? "Cargando…" : ""}
            />
            <div className="text-[11px] text-gray-500">(filtra modelos)</div>
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">Factory</div>
            <input
              list="dl-po-factories"
              value={po.factory || ""}
              onChange={(e) => setPO((prev) => ({ ...prev, factory: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
              placeholder={suggestionsLoading ? "Cargando…" : ""}
            />
            <div className="text-[11px] text-gray-500">(filtra modelos)</div>
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">P.I</div>
            <input
              value={(po.proforma_invoice ?? po.pi ?? "") || ""}
              onChange={(e) =>
                setPO((prev) => ({
                  ...prev,
                  proforma_invoice: e.target.value,
                  pi: e.target.value,
                }))
              }
              className="border w-full px-2 py-2 rounded"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">PO Date</div>
            <input
              type="date"
              value={poDateISO}
              onChange={(e) => setPO((prev) => ({ ...prev, po_date: e.target.value }))}
              className="border w-full px-2 py-2 rounded"
            />
            <div className="text-[11px] text-gray-500">(afecta al master price)</div>
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">Moneda</div>
            <select
              value={po.currency || "USD"}
              onChange={(e) => setPO((prev) => ({ ...prev, currency: e.target.value as any }))}
              className="border w-full px-2 py-2 rounded"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
        </div>

        {/* Buscar modelo */}
        <div className="flex items-center gap-2 text-sm">
          <input
            value={modeloQ}
            onChange={(e) => setModeloQ(e.target.value)}
            className="border px-3 py-2 rounded w-full"
            placeholder="Buscar modelo (style/ref)..."
          />
          <button
            onClick={loadModelos}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
            type="button"
          >
            {modelosLoading ? "Cargando..." : "Buscar"}
          </button>
        </div>

        {modelosError ? (
          <div className="text-sm text-red-600">❌ {modelosError}</div>
        ) : (
          <div className="text-xs text-gray-600">
            Modelos cargados: <b>{modelos.length}</b>
            {modelosLoading ? <span className="ml-2 text-gray-400">· cargando…</span> : null}
            {suggestionsError ? <span className="ml-2 text-red-500">· sug: {suggestionsError}</span> : null}
          </div>
        )}
      </div>

      {/* Líneas */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-md font-bold">📦 Líneas de pedido</h2>
          <button
            onClick={addLinea}
            className="border px-3 py-2 text-sm rounded bg-gray-50 hover:bg-gray-100"
            type="button"
          >
            ➕ Añadir línea
          </button>
        </div>

        {(po.lineas_pedido ?? []).map((l, i) => {
          const variantes = l.variantes ?? [];
          const mp = l.master_price;

          const masterLabel =
            l.master_price_status === "loading"
              ? "Cargando precio master..."
              : l.master_price_status === "none"
              ? "No hay precio master elegible"
              : l.master_price_status === "error"
              ? `Error: ${l.master_price_error || "?"}`
              : mp
              ? `OK · ${mp.currency} · BUY ${mp.buy_price} · SELL ${mp.sell_price ?? "-"} · desde ${mp.valid_from}`
              : "—";

          const canApply = Boolean(mp && po.season && l.modelo_id && l.variante_id);

          return (
            <div key={i} className="border rounded-xl p-4 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Línea #{i + 1}</div>
                <button
                  className="text-red-600 text-sm"
                  type="button"
                  onClick={() =>
                    setPO((prev) => {
                      const copy = [...(prev.lineas_pedido ?? [])];
                      copy.splice(i, 1);
                      return { ...prev, lineas_pedido: copy };
                    })
                  }
                >
                  ❌ Eliminar
                </button>
              </div>

              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Modelo</div>
                  <select
                    value={l.modelo_id ?? ""}
                    onChange={async (e) => {
                      const modeloId = e.target.value;

                      setPO((prev) => {
                        const copy = [...(prev.lineas_pedido ?? [])];
                        const modelo = modelos.find((m) => m.id === modeloId) || null;

                        copy[i] = {
                          ...copy[i],
                          modelo_id: modeloId || null,
                          variante_id: null,
                          variantes: [],
                          master_price: null,
                          master_price_status: "idle",
                          master_price_error: null,
                          style: modelo?.style || copy[i].style || "",
                        };

                        return { ...prev, lineas_pedido: copy };
                      });

                      if (modeloId) await loadVariantesForLine(i, modeloId);
                    }}
                    className="border w-full px-2 py-2 rounded bg-white"
                    disabled={false}
                  >
                    <option value="">-- Seleccionar modelo --</option>
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.style}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Variante (color)</div>
                  <select
                    value={l.variante_id ?? ""}
                    onChange={async (e) => {
                      const varianteId = e.target.value;

                      setPO((prev) => {
                        const copy = [...(prev.lineas_pedido ?? [])];
                        const v = (copy[i].variantes ?? []).find((vv) => vv.id === varianteId) || null;

                        copy[i] = {
                          ...copy[i],
                          variante_id: varianteId || null,
                          color: v?.color || copy[i].color || "",
                          reference: v?.reference || copy[i].reference || "",
                          master_price: null,
                          master_price_status: "idle",
                          master_price_error: null,
                        };

                        return { ...prev, lineas_pedido: copy };
                      });

                      if (varianteId) await loadMasterPriceForLine(i, varianteId);
                    }}
                    className="border w-full px-2 py-2 rounded bg-white"
                    disabled={!l.modelo_id || !(po.season || "").trim()}
                  >
                    <option value="">
                      {!po.season?.trim()
                        ? "-- Season requerida --"
                        : !l.modelo_id
                        ? "-- Selecciona modelo --"
                        : variantes.length
                        ? "-- Seleccionar color --"
                        : "-- Sin variantes para esa season --"}
                    </option>

                    {variantes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.color || "—"}
                        {v.reference ? ` · ${v.reference}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs text-gray-600">Precio master recomendado</div>
                  <div className="border rounded bg-white px-3 py-2 text-sm">{masterLabel}</div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                      onClick={() => l.variante_id && loadMasterPriceForLine(i, l.variante_id)}
                      disabled={!l.variante_id}
                    >
                      🔄 Recalcular
                    </button>

                    <button
                      type="button"
                      className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
                      onClick={() => applyMasterPriceToLine(i)}
                      disabled={!canApply}
                    >
                      ✅ Aplicar master
                    </button>
                  </div>

                  <div className="text-[11px] text-gray-600">
                    XIAMEN: aplica <b>SELL</b> a <b>price</b>. · BSG: <b>BUY</b> → price, <b>SELL</b> → price_selling.
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-6 gap-3 text-sm">
                {[
                  ["Ref", "reference", undefined],
                  ["Style", "style", undefined],
                  ["Color", "color", undefined],
                  ["Size", "size_run", "dl-po-sizes"],
                  ["Category", "category", "dl-po-categories"],
                  ["Channel", "channel", "dl-po-channels"],
                ].map(([label, key, listId]) => (
                  <label key={key as string} className="space-y-1">
                    <div className="text-xs text-gray-600">{label as string}</div>
                    <input
                      {...(listId ? { list: listId as string } : {})}
                      value={(l as any)[key as string] || ""}
                      onChange={(e) =>
                        setPO((prev) => {
                          const copy = [...(prev.lineas_pedido ?? [])];
                          copy[i] = { ...copy[i], [key as string]: e.target.value };
                          return { ...prev, lineas_pedido: copy };
                        })
                      }
                      className="border w-full px-2 py-2 rounded bg-white"
                    />
                  </label>
                ))}

                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Qty</div>
                  <input
                    type="number"
                    value={l.qty ?? 0}
                    onChange={(e) =>
                      setPO((prev) => {
                        const copy = [...(prev.lineas_pedido ?? [])];
                        copy[i] = { ...copy[i], qty: Number(e.target.value) || 0 };
                        return { ...prev, lineas_pedido: copy };
                      })
                    }
                    className="border w-full px-2 py-2 rounded bg-white text-right"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Price</div>
                  <input
                    type="number"
                    step="0.01"
                    value={l.price ?? 0}
                    onChange={(e) =>
                      setPO((prev) => {
                        const copy = [...(prev.lineas_pedido ?? [])];
                        copy[i] = { ...copy[i], price: Number(e.target.value) || 0 };
                        return { ...prev, lineas_pedido: copy };
                      })
                    }
                    className="border w-full px-2 py-2 rounded bg-white text-right"
                  />
                </label>
              </div>

              <div className="text-sm font-semibold">
                Total línea: {fmt((l.qty || 0) * (l.price || 0))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border text-sm font-semibold">
        📊 Total Pares: {totalPairs.toLocaleString("es-ES")} · Total Importe: {fmt(totalAmount)}
      </div>
    </div>
  );
}
