"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type POFormProps = {
  po?: any;
  successUrl?: string;
  cancelUrl?: string;
};

type CatalogItem = {
  modelo_id: string;
  variante_id: string;
  price_id: string | null;
  customer: string | null;
  supplier: string | null;
  factory: string | null;
  season: string | null;
  style: string | null;
  reference: string | null;
  color: string | null;
  size_range: string | null;
  currency: string | null;
  buy_price: number | null;
  sell_price: number | null;
  valid_from: string | null;
};

type MuestraForm = {
  id?: string;
  tipo_muestra: string;
  round: string;
  estado_muestra: string;
  fecha_teorica: string;
  fecha_muestra: string;
  notas: string;
};

type LineaForm = {
  id?: string;
  reference: string;
  style: string;
  color: string;
  size_run: string;
  category: string;
  channel: string;
  qty: string;
  price: string;
  amount: string;
  price_selling: string;
  amount_selling: string;
  pi_number: string;
  pi_bsg: string;
  etd: string;
  inspection: string;
  trial_upper: string;
  trial_lasting: string;
  lasting: string;
  finish_date: string;
  modelo_id: string;
  variante_id: string;
  master_buy_price_used: string;
  master_sell_price_used: string;
  master_currency_used: string;
  master_valid_from_used: string;
  master_price_id_used: string;
  master_price_source: string;
  muestras: MuestraForm[];
};

type SeasonActivationDialog = {
  lineIndex: number;
  modeloId: string;
  style: string;
  targetSeason: string;
  sourceSeason: string;
  sourceSeasons: string[];
  variantsCount: number;
  pricesCount: number;
} | null;

const SAMPLE_TYPE_OPTIONS = [
  "CFMS",
  "COUNTERS",
  "FITTINGS",
  "PPS",
  "TESTINGS",
  "SHIPPINGS",
] as const;

const SAMPLE_STATE_OPTIONS = [
  "Aprobado",
  "Enviado",
  "Pendiente",
  "Rechazado",
  "N/N",
] as const;

const SAMPLE_ROUND_OPTIONS = [
  "N/N",
  "Round 1",
  "Round 2",
  "Round 3",
  "Round 4",
  "Round 5",
] as const;

const DEFAULT_SAMPLE_TYPE = "CFMS";
const DEFAULT_SAMPLE_STATE = "Pendiente";

const emptyMuestra: MuestraForm = {
  tipo_muestra: DEFAULT_SAMPLE_TYPE,
  round: "Round 1",
  estado_muestra: DEFAULT_SAMPLE_STATE,
  fecha_teorica: "",
  fecha_muestra: "",
  notas: "",
};

const nnMuestra: MuestraForm = {
  tipo_muestra: DEFAULT_SAMPLE_TYPE,
  round: "N/N",
  estado_muestra: "N/N",
  fecha_teorica: "",
  fecha_muestra: "",
  notas: "No Need",
};

const emptyLinea: LineaForm = {
  reference: "",
  style: "",
  color: "",
  size_run: "",
  category: "",
  channel: "",
  qty: "",
  price: "",
  amount: "",
  price_selling: "",
  amount_selling: "",
  pi_number: "",
  pi_bsg: "",
  etd: "",
  inspection: "",
  trial_upper: "",
  trial_lasting: "",
  lasting: "",
  finish_date: "",
  modelo_id: "",
  variante_id: "",
  master_buy_price_used: "",
  master_sell_price_used: "",
  master_currency_used: "",
  master_valid_from_used: "",
  master_price_id_used: "",
  master_price_source: "",
  muestras: [],
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function money(qty: string, price: string) {
  const q = Number(qty || 0);
  const p = Number(String(price || "0").replace(",", "."));

  if (!Number.isFinite(q) || !Number.isFinite(p)) return "";

  return String(Number((q * p).toFixed(2)));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort();
}

function isBsgOperativa(value?: string | null) {
  return String(value ?? "").toUpperCase().includes("BSG");
}

function normalizeMuestras(linea: any): MuestraForm[] {
  const muestras = Array.isArray(linea?.muestras) ? linea.muestras : [];

  return muestras.map((muestra: any) => ({
    id: muestra.id,
    tipo_muestra: muestra.tipo_muestra ?? DEFAULT_SAMPLE_TYPE,
    round: muestra.round ?? "Round 1",
    estado_muestra: muestra.estado_muestra ?? DEFAULT_SAMPLE_STATE,
    fecha_teorica: toDateInput(muestra.fecha_teorica),
    fecha_muestra: toDateInput(muestra.fecha_muestra),
    notas: muestra.notas ?? "",
  }));
}

export function POForm({ po, successUrl, cancelUrl }: POFormProps) {
  const router = useRouter();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingSeason, setActivatingSeason] = useState(false);
  const [activationDialog, setActivationDialog] = useState<SeasonActivationDialog>(null);
  const [activationMessage, setActivationMessage] = useState("");

  const [formData, setFormData] = useState({
    po: po?.po ?? "",
    season: po?.season ?? "",
    customer: po?.customer ?? "",
    supplier: po?.supplier ?? "",
    factory: po?.factory ?? "",
    currency: po?.currency ?? "USD",
    po_date: toDateInput(po?.po_date),
    etd_pi: toDateInput(po?.etd_pi),
    pi: po?.pi ?? "",
    channel: po?.channel ?? "",
    booking: po?.booking ?? "",
    closing: po?.closing ?? "",
    shipping_date: toDateInput(po?.shipping_date),
    inspection: po?.inspection ?? "",
  });

  const [lineas, setLineas] = useState<LineaForm[]>(
    (po?.lineas_pedido ?? []).map((linea: any) => ({
      id: linea.id,
      reference: linea.reference ?? "",
      style: linea.style ?? "",
      color: linea.color ?? "",
      size_run: linea.size_run ?? "",
      category: linea.category ?? "",
      channel: linea.channel ?? po?.channel ?? "",
      qty: String(linea.qty ?? ""),
      price: String(linea.price ?? ""),
      amount: String(linea.amount ?? ""),
      price_selling: String(linea.price_selling ?? ""),
      amount_selling: String(linea.amount_selling ?? ""),
      pi_number: linea.pi_number ?? "",
      pi_bsg: linea.pi_bsg ?? "",
      etd: toDateInput(linea.etd),
      inspection: toDateInput(linea.inspection),
      trial_upper: linea.trial_upper ?? "",
      trial_lasting: linea.trial_lasting ?? "",
      lasting: linea.lasting ?? "",
      finish_date: toDateInput(linea.finish_date),
      modelo_id: linea.modelo_id ?? "",
      variante_id: linea.variante_id ?? "",
      master_buy_price_used: String(linea.master_buy_price_used ?? ""),
      master_sell_price_used: String(linea.master_sell_price_used ?? ""),
      master_currency_used: linea.master_currency_used ?? "",
      master_valid_from_used: toDateInput(linea.master_valid_from_used),
      master_price_id_used: linea.master_price_id_used ?? "",
      master_price_source: linea.master_price_source ?? "",
      muestras: normalizeMuestras(linea),
    }))
  );

  async function reloadCatalog() {
    const res = await fetch("/api/po-catalog", { cache: "no-store" });
    const json = await res.json();

    setCatalog(json.data ?? []);
    setCategoryOptions(json.meta?.categories ?? []);
    setChannelOptions(json.meta?.channels ?? []);

    return (json.data ?? []) as CatalogItem[];
  }

  useEffect(() => {
    reloadCatalog();
  }, []);

  const baseScopedCatalog = useMemo(() => {
    return catalog.filter((item) => {
      if (formData.customer && item.customer !== formData.customer) return false;
      if (formData.supplier && item.supplier !== formData.supplier) return false;
      if (formData.factory && item.factory && item.factory !== formData.factory) return false;

      return true;
    });
  }, [catalog, formData.customer, formData.supplier, formData.factory]);

  const customers = unique(catalog.map((x) => x.customer));
  const suppliers = unique(catalog.map((x) => x.supplier));
  const factories = unique(catalog.map((x) => x.factory));
  const seasons = unique(catalog.map((x) => x.season));

  function updateHeader(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "channel" && !isBsgOperativa(value)) {
      setLineas((prev) => prev.map((linea) => ({ ...linea, pi_bsg: "" })));
    }
  }

  function updateLinea(index: number, field: keyof LineaForm, value: string) {
    setLineas((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };

      if (field === "qty" || field === "price") {
        row.amount = money(
          field === "qty" ? value : row.qty,
          field === "price" ? value : row.price
        );
      }

      if (field === "qty" || field === "price_selling") {
        row.amount_selling = money(
          field === "qty" ? value : row.qty,
          field === "price_selling" ? value : row.price_selling
        );
      }

      if (field === "channel" && !isBsgOperativa(value)) {
        row.pi_bsg = "";
      }

      next[index] = row;
      return next;
    });
  }

  function updateMuestra(lineaIndex: number, muestraIndex: number, field: keyof MuestraForm, value: string) {
    setLineas((prev) => {
      const next = [...prev];
      const linea = { ...next[lineaIndex] };
      const muestras = [...linea.muestras];
      muestras[muestraIndex] = { ...muestras[muestraIndex], [field]: value };

      if ((field === "round" && value === "N/N") || (field === "estado_muestra" && value === "N/N")) {
        muestras[muestraIndex] = {
          ...muestras[muestraIndex],
          round: "N/N",
          estado_muestra: "N/N",
          fecha_muestra: "",
          notas: muestras[muestraIndex].notas || "No Need",
        };
      }

      if (field === "round" && value !== "N/N" && muestras[muestraIndex].estado_muestra === "N/N") {
        muestras[muestraIndex] = {
          ...muestras[muestraIndex],
          estado_muestra: DEFAULT_SAMPLE_STATE,
          notas: muestras[muestraIndex].notas === "No Need" ? "" : muestras[muestraIndex].notas,
        };
      }

      linea.muestras = muestras;
      next[lineaIndex] = linea;

      return next;
    });
  }

  function applyCatalogItem(index: number, item: CatalogItem) {
    setLineas((prev) => {
      const next = [...prev];
      const qty = next[index]?.qty ?? "";
      const buyPrice = item.buy_price != null ? String(item.buy_price) : "";
      const sellPrice = item.sell_price != null ? String(item.sell_price) : "";

      next[index] = {
        ...next[index],
        modelo_id: item.modelo_id,
        variante_id: item.variante_id,
        reference: item.reference ?? "",
        style: item.style ?? "",
        color: item.color ?? "",
        size_run: item.size_range ?? "",
        price: buyPrice,
        price_selling: sellPrice,
        amount: money(qty, buyPrice),
        amount_selling: money(qty, sellPrice),
        master_buy_price_used: buyPrice,
        master_sell_price_used: sellPrice,
        master_currency_used: item.currency ?? formData.currency,
        master_valid_from_used: item.valid_from ?? "",
        master_price_id_used: item.price_id ?? "",
        master_price_source: item.price_id ? "modelo_precios" : "",
      };

      return next;
    });

    if (item.currency) {
      setFormData((prev) => ({ ...prev, currency: item.currency ?? prev.currency }));
    }

    if (item.factory && !formData.factory) {
      setFormData((prev) => ({ ...prev, factory: item.factory ?? prev.factory }));
    }
  }

  function addLinea() {
    setLineas((prev) => [
      ...prev,
      {
        ...emptyLinea,
        channel: formData.channel,
        pi_number: formData.pi,
        etd: formData.etd_pi,
        inspection: toDateInput(formData.inspection),
      },
    ]);
  }

  function removeLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  function addMuestra(lineaIndex: number) {
    setLineas((prev) => {
      const next = [...prev];
      const linea = { ...next[lineaIndex] };
      linea.muestras = [...linea.muestras, { ...emptyMuestra }];
      next[lineaIndex] = linea;
      return next;
    });
  }

  function setNoNeedMuestra(lineaIndex: number) {
    setLineas((prev) => {
      const next = [...prev];
      const linea = { ...next[lineaIndex] };
      linea.muestras = [{ ...nnMuestra }];
      next[lineaIndex] = linea;
      return next;
    });
  }

  function removeMuestra(lineaIndex: number, muestraIndex: number) {
    setLineas((prev) => {
      const next = [...prev];
      const linea = { ...next[lineaIndex] };
      linea.muestras = linea.muestras.filter((_, i) => i !== muestraIndex);
      next[lineaIndex] = linea;
      return next;
    });
  }

  function openActivateSeasonDialog(index: number) {
    const linea = lineas[index];

    if (!linea.style.trim()) {
      alert("Selecciona primero un modelo/style.");
      return;
    }

    if (!formData.season.trim()) {
      alert("Selecciona primero la temporada destino en la cabecera.");
      return;
    }

    const candidates = baseScopedCatalog.filter((item) => item.style === linea.style);
    const modeloId = candidates[0]?.modelo_id;

    if (!modeloId) {
      alert("No se encontró el modelo en catálogo.");
      return;
    }

    const sourceSeasons = unique(
      candidates
        .map((item) => item.season)
        .filter((season) => season && season !== formData.season)
    );

    if (sourceSeasons.length === 0) {
      alert("Este modelo no tiene temporadas origen disponibles.");
      return;
    }

    const defaultSourceSeason = sourceSeasons[0];
    const sourceItems = candidates.filter((item) => item.season === defaultSourceSeason);

    setActivationMessage("");
    setActivationDialog({
      lineIndex: index,
      modeloId,
      style: linea.style,
      targetSeason: formData.season,
      sourceSeason: defaultSourceSeason,
      sourceSeasons,
      variantsCount: unique(sourceItems.map((item) => item.variante_id)).length,
      pricesCount: sourceItems.filter((item) => item.price_id).length,
    });
  }

  function updateActivationSourceSeason(sourceSeason: string) {
    setActivationDialog((prev) => {
      if (!prev) return prev;

      const sourceItems = baseScopedCatalog.filter(
        (item) => item.modelo_id === prev.modeloId && item.season === sourceSeason
      );

      return {
        ...prev,
        sourceSeason,
        variantsCount: unique(sourceItems.map((item) => item.variante_id)).length,
        pricesCount: sourceItems.filter((item) => item.price_id).length,
      };
    });
  }

  async function confirmActivateSeason() {
    if (!activationDialog) return;

    setActivatingSeason(true);
    setActivationMessage("");

    try {
      const res = await fetch("/api/modelos/activate-season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo_id: activationDialog.modeloId,
          source_season: activationDialog.sourceSeason,
          target_season: activationDialog.targetSeason,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setActivationMessage(json?.error ?? "Error activando temporada.");
        return;
      }

      await reloadCatalog();

      const lineIndex = activationDialog.lineIndex;

      setLineas((prev) => {
        const next = [...prev];

        if (!next[lineIndex]) return next;

        next[lineIndex] = {
          ...next[lineIndex],
          variante_id: "",
          color: "",
          reference: "",
          price: "",
          price_selling: "",
          amount: "",
          amount_selling: "",
          master_buy_price_used: "",
          master_sell_price_used: "",
          master_currency_used: "",
          master_valid_from_used: "",
          master_price_id_used: "",
          master_price_source: "",
        };

        return next;
      });

      setActivationDialog(null);
      setActivationMessage("Temporada activada correctamente. Ya puedes seleccionar la variante.");
    } finally {
      setActivatingSeason(false);
    }
  }

  function validateBeforeSave() {
    if (!formData.po.trim()) return "PO es obligatorio.";
    if (!formData.customer.trim()) return "Customer es obligatorio.";
    if (!formData.supplier.trim()) return "Supplier es obligatorio.";
    if (!formData.factory.trim()) return "Factory es obligatorio.";
    if (!formData.season.trim()) return "Season es obligatorio.";

    if (lineas.length === 0) return "Debes añadir al menos una línea.";

    for (const [index, linea] of lineas.entries()) {
      const rowNumber = index + 1;

      if (!linea.style.trim()) return `La línea ${rowNumber} no tiene modelo/style.`;
      if (!linea.color.trim()) return `La línea ${rowNumber} no tiene color.`;
      if (!linea.qty || Number(linea.qty) <= 0) return `La línea ${rowNumber} no tiene cantidad válida.`;

      const operativeChannel = linea.channel || formData.channel;
      if (!isBsgOperativa(operativeChannel) && linea.pi_bsg.trim()) {
        return `La línea ${rowNumber} tiene PI BSG pero no pertenece a operativa BSG.`;
      }

      for (const [muestraIndex, muestra] of linea.muestras.entries()) {
        const muestraNumber = muestraIndex + 1;

        if (!muestra.tipo_muestra.trim()) {
          return `La muestra ${muestraNumber} de la línea ${rowNumber} no tiene tipo.`;
        }

        if (!muestra.round.trim()) {
          return `La muestra ${muestraNumber} de la línea ${rowNumber} no tiene round.`;
        }
      }
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateBeforeSave();

    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);

    const payload = {
      po: formData,
      lineas_pedido: lineas.map((linea) => {
        const operativeChannel = linea.channel || formData.channel;

        return {
          ...linea,
          pi_bsg: isBsgOperativa(operativeChannel) ? linea.pi_bsg : "",
          muestras: linea.muestras,
        };
      }),
    };

    const url = po?.id ? `/api/po/${po.id}` : "/api/po";
    const method = po?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? "Error guardando PO");
      return;
    }

    router.push(successUrl ?? (po?.id ? `/po/${po.id}` : "/produccion/pos"));
    router.refresh();
  }

  function handleCancel() {
    router.push(cancelUrl ?? (po?.id ? `/po/${po.id}` : "/produccion/pos"));
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">{po?.id ? "Editar PO" : "Nuevo PO"}</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <Field label="PO" value={formData.po} onChange={(v) => updateHeader("po", v)} required />

          <SelectOrInput label="Season" value={formData.season} options={seasons} onChange={(v) => updateHeader("season", v)} />
          <SelectOrInput label="Customer" value={formData.customer} options={customers} onChange={(v) => updateHeader("customer", v)} />
          <SelectOrInput label="Supplier" value={formData.supplier} options={suppliers} onChange={(v) => updateHeader("supplier", v)} />
          <SelectOrInput label="Factory" value={formData.factory} options={factories} onChange={(v) => updateHeader("factory", v)} />

          <Field label="Currency" value={formData.currency} onChange={(v) => updateHeader("currency", v)} />
          <Field label="PO Date" type="date" value={formData.po_date} onChange={(v) => updateHeader("po_date", v)} />
          <Field label="PI general" value={formData.pi} onChange={(v) => updateHeader("pi", v)} />
          <Field label="ETD PI general" type="date" value={formData.etd_pi} onChange={(v) => updateHeader("etd_pi", v)} />
          <DataListField label="Channel" value={formData.channel} options={channelOptions} onChange={(v) => updateHeader("channel", v)} />
          <Field label="Booking" value={formData.booking} onChange={(v) => updateHeader("booking", v)} />
          <Field label="Closing" value={formData.closing} onChange={(v) => updateHeader("closing", v)} />
          <Field label="Shipping" type="date" value={formData.shipping_date} onChange={(v) => updateHeader("shipping_date", v)} />
          <Field label="Inspection general" value={formData.inspection} onChange={(v) => updateHeader("inspection", v)} />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Líneas de pedido</h2>
            <p className="text-sm text-slate-500">
              Cada línea puede tener su propia PI, ETD PI y muestras.
            </p>
          </div>

          <button type="button" onClick={addLinea} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
            + Añadir línea
          </button>
        </div>

        <div className="space-y-6">
          {lineas.map((linea, index) => {
            const styleOptions = unique(baseScopedCatalog.map((x) => x.style));
            const styleCatalog = baseScopedCatalog.filter((x) => x.style === linea.style);
            const colorOptions = styleCatalog.filter((x) => !formData.season || x.season === formData.season);
            const sourceSeasonOptions = unique(
              styleCatalog
                .map((x) => x.season)
                .filter((season) => season && season !== formData.season)
            );
            const canActivateSeason =
              Boolean(linea.style) &&
              Boolean(formData.season) &&
              colorOptions.length === 0 &&
              sourceSeasonOptions.length > 0;
            const operativeChannel = linea.channel || formData.channel;
            const isBsg = isBsgOperativa(operativeChannel);

            return (
              <article key={`${linea.id ?? "new"}-${index}`} className="rounded-lg border bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Línea {index + 1}</h3>

                  <button
                    type="button"
                    onClick={() => removeLinea(index)}
                    className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                  >
                    Eliminar línea
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[2100px] text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <Th>Modelo / Style</Th>
                        <Th>Color</Th>
                        <Th>Reference</Th>
                        <Th>Size</Th>
                        <Th>Category</Th>
                        <Th>Channel</Th>
                        <Th>Qty</Th>
                        <Th>Buy</Th>
                        <Th>Amount</Th>
                        <Th>Sell</Th>
                        <Th>Sell Amount</Th>
                        <Th>PI línea</Th>
                        <Th>PI BSG</Th>
                        <Th>ETD línea</Th>
                        <Th>Inspection</Th>
                        <Th>Trial U</Th>
                        <Th>Trial L</Th>
                        <Th>Lasting</Th>
                        <Th>Finish</Th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-b bg-white">
                        <Td>
                          <select
                            className="w-full rounded border px-2 py-1"
                            value={linea.style}
                            onChange={(e) => {
                              updateLinea(index, "style", e.target.value);
                              updateLinea(index, "color", "");
                              updateLinea(index, "variante_id", "");
                            }}
                          >
                            <option value="">Seleccionar</option>
                            {styleOptions.map((style) => (
                              <option key={style} value={style}>
                                {style}
                              </option>
                            ))}
                          </select>

                          {canActivateSeason ? (
                            <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                              <div className="mb-1 font-medium">
                                No hay variantes de este modelo para {formData.season}.
                              </div>
                              <button
                                type="button"
                                disabled={activatingSeason}
                                onClick={() => openActivateSeasonDialog(index)}
                                className="rounded bg-amber-600 px-2 py-1 text-white disabled:opacity-50"
                              >
                                Crear temporada para este modelo
                              </button>
                            </div>
                          ) : null}
                        </Td>

                        <Td>
                          <select
                            className="w-full rounded border px-2 py-1"
                            value={linea.variante_id}
                            onChange={(e) => {
                              const item = colorOptions.find((x) => x.variante_id === e.target.value);
                              if (item) applyCatalogItem(index, item);
                            }}
                          >
                            <option value="">Seleccionar</option>
                            {colorOptions.map((item) => (
                              <option key={item.variante_id} value={item.variante_id}>
                                {item.color} · {item.reference} · {item.season}
                              </option>
                            ))}
                          </select>

                          {linea.style && formData.season && colorOptions.length === 0 ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Sin variantes para {formData.season}.
                            </div>
                          ) : null}
                        </Td>

                        <Td><SmallInput value={linea.reference} onChange={(v) => updateLinea(index, "reference", v)} /></Td>
                        <Td><SmallInput value={linea.size_run} onChange={(v) => updateLinea(index, "size_run", v)} /></Td>

                        <Td>
                          <DataListInput
                            value={linea.category}
                            options={categoryOptions}
                            onChange={(v) => updateLinea(index, "category", v)}
                          />
                        </Td>

                        <Td>
                          <DataListInput
                            value={linea.channel}
                            options={channelOptions}
                            onChange={(v) => updateLinea(index, "channel", v)}
                          />
                        </Td>

                        <Td><SmallInput type="number" value={linea.qty} onChange={(v) => updateLinea(index, "qty", v)} /></Td>
                        <Td><SmallInput value={linea.price} onChange={(v) => updateLinea(index, "price", v)} /></Td>
                        <Td><ReadOnlyValue value={linea.amount} /></Td>
                        <Td><SmallInput value={linea.price_selling} onChange={(v) => updateLinea(index, "price_selling", v)} /></Td>
                        <Td><ReadOnlyValue value={linea.amount_selling} /></Td>
                        <Td><SmallInput value={linea.pi_number} onChange={(v) => updateLinea(index, "pi_number", v)} /></Td>
                        <Td>
                          <SmallInput
                            value={isBsg ? linea.pi_bsg : ""}
                            disabled={!isBsg}
                            placeholder={isBsg ? "" : "Solo BSG"}
                            onChange={(v) => updateLinea(index, "pi_bsg", v)}
                          />
                        </Td>
                        <Td><SmallInput type="date" value={linea.etd} onChange={(v) => updateLinea(index, "etd", v)} /></Td>
                        <Td><SmallInput type="date" value={linea.inspection} onChange={(v) => updateLinea(index, "inspection", v)} /></Td>
                        <Td><SmallInput value={linea.trial_upper} onChange={(v) => updateLinea(index, "trial_upper", v)} /></Td>
                        <Td><SmallInput value={linea.trial_lasting} onChange={(v) => updateLinea(index, "trial_lasting", v)} /></Td>
                        <Td><SmallInput value={linea.lasting} onChange={(v) => updateLinea(index, "lasting", v)} /></Td>
                        <Td><SmallInput type="date" value={linea.finish_date} onChange={(v) => updateLinea(index, "finish_date", v)} /></Td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-lg border bg-white p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">Muestras de la línea</h4>
                      <p className="text-xs text-slate-500">
                        N/N es No Need: neutro, no bloquea y no genera alerta.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addMuestra(index)}
                        className="rounded border px-3 py-1 text-xs"
                      >
                        + Round 1
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoNeedMuestra(index)}
                        className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-700"
                      >
                        Marcar N/N
                      </button>
                    </div>
                  </div>

                  {linea.muestras.length === 0 ? (
                    <div className="rounded border border-dashed p-3 text-sm text-slate-500">
                      Sin muestras definidas para esta línea.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <Th>Tipo</Th>
                            <Th>Round</Th>
                            <Th>Estado</Th>
                            <Th>Fecha teórica</Th>
                            <Th>Fecha real China</Th>
                            <Th>Notas</Th>
                            <Th></Th>
                          </tr>
                        </thead>

                        <tbody>
                          {linea.muestras.map((muestra, muestraIndex) => {
                            const isNoNeed = muestra.round === "N/N" || muestra.estado_muestra === "N/N";

                            return (
                              <tr key={`${muestra.id ?? "new"}-${muestraIndex}`} className="border-b">
                                <Td>
                                  <select
                                    className="w-full min-w-36 rounded border px-2 py-1"
                                    value={muestra.tipo_muestra}
                                    onChange={(e) => updateMuestra(index, muestraIndex, "tipo_muestra", e.target.value)}
                                  >
                                    {SAMPLE_TYPE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </Td>

                                <Td>
                                  <select
                                    className="w-full min-w-24 rounded border px-2 py-1"
                                    value={muestra.round}
                                    onChange={(e) => updateMuestra(index, muestraIndex, "round", e.target.value)}
                                  >
                                    {SAMPLE_ROUND_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </Td>

                                <Td>
                                  <select
                                    className="w-full min-w-32 rounded border px-2 py-1 disabled:bg-slate-100 disabled:text-slate-500"
                                    value={muestra.estado_muestra}
                                    disabled={isNoNeed}
                                    onChange={(e) => updateMuestra(index, muestraIndex, "estado_muestra", e.target.value)}
                                  >
                                    {SAMPLE_STATE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </Td>

                                <Td>
                                  <ReadOnlyValue value={muestra.fecha_teorica} />
                                </Td>

                                <Td>
                                  <SmallInput
                                    type="date"
                                    value={isNoNeed ? "" : muestra.fecha_muestra}
                                    disabled={isNoNeed}
                                    onChange={(v) => updateMuestra(index, muestraIndex, "fecha_muestra", v)}
                                  />
                                </Td>

                                <Td>
                                  <SmallInput
                                    value={muestra.notas}
                                    onChange={(v) => updateMuestra(index, muestraIndex, "notas", v)}
                                  />
                                </Td>

                                <Td>
                                  <button
                                    type="button"
                                    onClick={() => removeMuestra(index, muestraIndex)}
                                    className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                                  >
                                    Eliminar
                                  </button>
                                </Td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {lineas.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-slate-500">
              No hay líneas añadidas.
            </div>
          ) : null}
        </div>
      </section>

      {activationMessage ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {activationMessage}
        </div>
      ) : null}

      {activationDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Activar temporada de modelo</h3>
              <p className="mt-1 text-sm text-slate-500">
                Se copiará el catálogo operativo del modelo. No se tocarán líneas de pedido.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">Modelo</div>
                  <div className="font-medium">{activationDialog.style}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Temporada destino</div>
                  <div className="font-medium">{activationDialog.targetSeason}</div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Temporada origen</span>
                <select
                  value={activationDialog.sourceSeason}
                  disabled={activatingSeason}
                  onChange={(e) => updateActivationSourceSeason(e.target.value)}
                  className="w-full rounded border bg-white px-3 py-2"
                >
                  {activationDialog.sourceSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded border bg-white p-3">
                <div className="mb-2 font-medium">Se copiará:</div>
                <ul className="space-y-1 text-slate-700">
                  <li>✓ Variantes: {activationDialog.variantsCount}</li>
                  <li>✓ Precios vigentes: {activationDialog.pricesCount}</li>
                  <li>✓ Componentes asociados a variante</li>
                  <li>✓ Imágenes asociadas a variante</li>
                </ul>
              </div>

              {activationMessage ? (
                <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
                  {activationMessage}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={activatingSeason}
                onClick={() => setActivationDialog(null)}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={activatingSeason}
                onClick={confirmActivateSeason}
                className="rounded bg-amber-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {activatingSeason ? "Activando..." : "Activar temporada"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleCancel} className="rounded border px-4 py-2">
          Cancelar
        </button>

        <button disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
    </label>
  );
}

function SelectOrInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const listId = `${label.toLowerCase().replace(/\s+/g, "-")}-options`;

  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>

      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />

      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

function DataListField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <DataListInput value={value} options={options} onChange={onChange} />
    </label>
  );
}

function DataListInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const listId = useMemo(() => `list-${Math.random().toString(36).slice(2)}`, []);

  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-24 rounded border px-2 py-1"
      />

      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}

function SmallInput({
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-24 rounded border px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div className="min-w-24 rounded border bg-slate-50 px-2 py-1 text-slate-700">
      {value || "-"}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap p-2 text-left text-xs font-semibold">{children}</th>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="p-1 align-top">{children}</td>;
}
