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

  const poSeasonRef = useRef<string>("");
  useEffect(() => {
    poSeasonRef.current = String(po.season ?? "").trim();
  }, [po.season]);

  const [modelos, setModelos] = useState<TModelo[]>([]);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [modelosError, setModelosError] = useState<string | null>(null);
  const [modeloQ, setModeloQ] = useState("");

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
    () =>
      (po.lineas_pedido ?? []).reduce(
        (a, l) => a + (l.qty || 0) * (l.price || 0),
        0
      ),
    [po.lineas_pedido]
  );

  // ------------------ LOAD PO ------------------
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
      lineas_pedido: Array.isArray(json?.lineas_pedido)
        ? json.lineas_pedido
        : [],
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
  }, [idParam]);

  // ------------------ FUNCIONES UTILES ------------------
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

  const eliminarPO = async () => {
    if (isNew) return;

    const poLabel = po.po ? `PO ${po.po}` : "este PO";
    const ok = confirm(
      `⚠️ Vas a eliminar ${poLabel}.\nEsto borrará también todas sus líneas y datos asociados.\n¿Seguro que quieres continuar?`
    );

    if (!ok) return;

    try {
      const res = await fetch(`/api/po/${idParam}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Error eliminando PO");

      alert("🗑️ PO eliminado correctamente");
      router.push("/produccion/dashboard");
    } catch (e: any) {
      console.error(e);
      alert(`❌ No se pudo eliminar el PO: ${e?.message || "Error"}`);
    }
  };

  // ------------------ RENDER ------------------
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">✏️ {isNew ? "Nuevo PO" : "Editar PO"}</h1>

        <div className="flex gap-2">
          <button
            onClick={guardar}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
            type="button"
          >
            💾 Guardar
          </button>

          {!isNew && (
            <button
              onClick={eliminarPO}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm"
              type="button"
            >
              🗑️ Eliminar
            </button>
          )}

          <button
            onClick={() => router.back()}
            className="bg-gray-200 px-4 py-2 rounded text-sm"
            type="button"
          >
            ← Cancelar
          </button>
        </div>
      </div>

      {/* TOTAL PARES / IMPORTE */}
      <div className="p-4 bg-gray-50 rounded-xl border text-sm font-semibold">
        📊 Total Pares: {totalPairs.toLocaleString("es-ES")} · Total Importe: {fmt(totalAmount)}
      </div>
    </div>
  );
}