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

export function POForm({ po, successUrl, cancelUrl }: POFormProps) {
  const router = useRouter();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    }))
  );

  useEffect(() => {
    async function loadCatalog() {
      const res = await fetch("/api/po-catalog", { cache: "no-store" });
      const json = await res.json();

      setCatalog(json.data ?? []);
    }

    loadCatalog();
  }, []);

  const scopedCatalog = useMemo(() => {
    return catalog.filter((item) => {
      if (formData.customer && item.customer !== formData.customer) return false;
      if (formData.supplier && item.supplier !== formData.supplier) return false;
      if (formData.factory && item.factory !== formData.factory) return false;
      if (formData.season && item.season !== formData.season) return false;

      return true;
    });
  }, [catalog, formData.customer, formData.supplier, formData.factory, formData.season]);

  const customers = unique(catalog.map((x) => x.customer));
  const suppliers = unique(catalog.map((x) => x.supplier));
  const factories = unique(catalog.map((x) => x.factory));
  const seasons = unique(catalog.map((x) => x.season));

  function updateHeader(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

      next[index] = row;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      po: formData,
      lineas_pedido: lineas,
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

          <SelectOrInput
            label="Season"
            value={formData.season}
            options={seasons}
            onChange={(v) => updateHeader("season", v)}
          />

          <SelectOrInput
            label="Customer"
            value={formData.customer}
            options={customers}
            onChange={(v) => updateHeader("customer", v)}
          />

          <SelectOrInput
            label="Supplier"
            value={formData.supplier}
            options={suppliers}
            onChange={(v) => updateHeader("supplier", v)}
          />

          <SelectOrInput
            label="Factory"
            value={formData.factory}
            options={factories}
            onChange={(v) => updateHeader("factory", v)}
          />

          <Field label="Currency" value={formData.currency} onChange={(v) => updateHeader("currency", v)} />
          <Field label="PO Date" type="date" value={formData.po_date} onChange={(v) => updateHeader("po_date", v)} />
          <Field label="PI general" value={formData.pi} onChange={(v) => updateHeader("pi", v)} />
          <Field label="ETD PI general" type="date" value={formData.etd_pi} onChange={(v) => updateHeader("etd_pi", v)} />
          <Field label="Booking" value={formData.booking} onChange={(v) => updateHeader("booking", v)} />
          <Field label="Closing" value={formData.closing} onChange={(v) => updateHeader("closing", v)} />
          <Field label="Shipping" type="date" value={formData.shipping_date} onChange={(v) => updateHeader("shipping_date", v)} />
          <Field label="Inspection general" value={formData.inspection} onChange={(v) => updateHeader("inspection", v)} />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Líneas de pedido</h2>

          <button
            type="button"
            onClick={addLinea}
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
          >
            + Añadir línea
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1700px] text-sm">
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
                <Th>Sell</Th>
                <Th>PI línea</Th>
                <Th>PI BSG</Th>
                <Th>ETD línea</Th>
                <Th>Inspection</Th>
                <Th>Trial U</Th>
                <Th>Trial L</Th>
                <Th>Lasting</Th>
                <Th>Finish</Th>
                <Th></Th>
              </tr>
            </thead>

            <tbody>
              {lineas.map((linea, index) => {
                const styleOptions = unique(scopedCatalog.map((x) => x.style));
                const colorOptions = scopedCatalog.filter((x) => x.style === linea.style);

                return (
                  <tr key={`${linea.id ?? "new"}-${index}`} className="border-b">
                    <Td>
                      <select
                        className="w-full rounded border px-2 py-1"
                        value={linea.style}
                        onChange={(e) => {
                          updateLinea(index, "style", e.target.value);
                          updateLinea(index, "color", "");
                        }}
                      >
                        <option value="">Seleccionar</option>
                        {styleOptions.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                    </Td>

                    <Td>
                      <select
                        className="w-full rounded border px-2 py-1"
                        value={linea.color}
                        onChange={(e) => {
                          const item = colorOptions.find((x) => x.color === e.target.value);
                          if (item) applyCatalogItem(index, item);
                        }}
                      >
                        <option value="">Seleccionar</option>
                        {colorOptions.map((item) => (
                          <option key={item.variante_id} value={item.color ?? ""}>
                            {item.color}
                          </option>
                        ))}
                      </select>
                    </Td>

                    <Td>
                      <SmallInput value={linea.reference} onChange={(v) => updateLinea(index, "reference", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.size_run} onChange={(v) => updateLinea(index, "size_run", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.category} onChange={(v) => updateLinea(index, "category", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.channel} onChange={(v) => updateLinea(index, "channel", v)} />
                    </Td>

                    <Td>
                      <SmallInput type="number" value={linea.qty} onChange={(v) => updateLinea(index, "qty", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.price} onChange={(v) => updateLinea(index, "price", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.price_selling} onChange={(v) => updateLinea(index, "price_selling", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.pi_number} onChange={(v) => updateLinea(index, "pi_number", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.pi_bsg} onChange={(v) => updateLinea(index, "pi_bsg", v)} />
                    </Td>

                    <Td>
                      <SmallInput type="date" value={linea.etd} onChange={(v) => updateLinea(index, "etd", v)} />
                    </Td>

                    <Td>
                      <SmallInput type="date" value={linea.inspection} onChange={(v) => updateLinea(index, "inspection", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.trial_upper} onChange={(v) => updateLinea(index, "trial_upper", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.trial_lasting} onChange={(v) => updateLinea(index, "trial_lasting", v)} />
                    </Td>

                    <Td>
                      <SmallInput value={linea.lasting} onChange={(v) => updateLinea(index, "lasting", v)} />
                    </Td>

                    <Td>
                      <SmallInput type="date" value={linea.finish_date} onChange={(v) => updateLinea(index, "finish_date", v)} />
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() => removeLinea(index)}
                        className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                      >
                        Eliminar
                      </button>
                    </Td>
                  </tr>
                );
              })}

              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={18} className="p-6 text-center text-sm text-slate-500">
                    No hay líneas añadidas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

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

function SmallInput({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-24 rounded border px-2 py-1"
    />
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap p-2 text-left text-xs font-semibold">{children}</th>;
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td className="p-1 align-top">{children}</td>;
}