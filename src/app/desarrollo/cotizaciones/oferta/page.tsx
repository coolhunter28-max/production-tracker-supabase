"use client";

import * as React from "react";
import Link from "next/link";

type ModeloObj = {
  id?: string;
  style: string;
  reference: string | null;
  customer: string | null;
  size_range?: string | null;
  picture_url?: string | null; // foto del modelo base
};

type VarianteObj = {
  id?: string;
  season: string;
  color: string;
  reference: string;
};

type Row = {
  id: string;
  variante_id: string;
  status: string;
  currency: string;
  buy_price: number;
  sell_price: number;
  created_at: string;

  // 👇 OJO: a veces Supabase devuelve array ([]) y otras objeto.
  modelos: ModeloObj | ModeloObj[] | null;
  modelo_variantes: VarianteObj | VarianteObj[] | null;
};

type CompsMap = Record<
  string,
  {
    source: "variante" | "base" | "none";
    kinds: Record<string, string>;
  }
>;

type ImagesMap = Record<string, string>; // variante_id -> public_url

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function toNumber(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// ✅ Formato ES para Excel: 21,00 (coma decimal)
function fmtMoneyES(n: any) {
  const v = toNumber(n);
  // ✅ Forzar texto en Excel para que NO convierta 21,00 -> 2100
  return " " + v.toFixed(2).replace(".", ",");
}

// ✅ Formato UI: 21.00
function fmtMoneyUI(n: any) {
  const v = toNumber(n);
  return v.toFixed(2);
}

// CSV para Excel ES: separador ";" + coma decimal
function toCSV_ES(rows: any[], headers: string[]) {
  const sep = ";";
  const esc = (s: any) => {
    const str = String(s ?? "");
    // si contiene ; o " o salto, encerramos entre comillas
    if (str.includes('"') || str.includes(sep) || str.includes("\n"))
      return `"${str.replaceAll('"', '""')}"`;
    return str;
  };
  const lines = [
    headers.map(esc).join(sep),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(sep)),
  ];
  return lines.join("\n");
}

// ✅ última cotización por variante_id
function pickLatestByVariante(list: Row[]) {
  const map = new Map<string, Row>();
  for (const r of list) {
    const key = String(r.variante_id || "");
    if (!key) continue;

    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }
    const tPrev = new Date(prev.created_at).getTime();
    const tNow = new Date(r.created_at).getTime();
    if (tNow > tPrev) map.set(key, r);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ✅ Normalizadores (objeto vs array)
function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? v[0] : null;
  return v;
}

export default function OfertaClientePage() {
  const [customerOptions, setCustomerOptions] = React.useState<string[]>([]);
  const [seasonOptions, setSeasonOptions] = React.useState<string[]>([]);
  const [metaLoading, setMetaLoading] = React.useState(false);

  const [customer, setCustomer] = React.useState("");
  const [season, setSeason] = React.useState("");
  const [status, setStatus] = React.useState("");

  // Cabecera
  const [offerDate, setOfferDate] = React.useState(todayISODate());
  const [incoterm, setIncoterm] = React.useState("FOB XIAMEN");
  const [moq, setMoq] = React.useState("MOQ 3.000 pairs per style, 1.200 pairs per color");

  const [includeComps, setIncludeComps] = React.useState(true);
  const [includePhotos, setIncludePhotos] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const [rowsRaw, setRowsRaw] = React.useState<Row[]>([]);
  const rows = React.useMemo(() => pickLatestByVariante(rowsRaw), [rowsRaw]);

  const [compsMap, setCompsMap] = React.useState<CompsMap>({});
  const [compsLoading, setCompsLoading] = React.useState(false);

  // ✅ NUEVO: mapa de fotos por variante
  const [imagesMap, setImagesMap] = React.useState<ImagesMap>({});
  const [imagesLoading, setImagesLoading] = React.useState(false);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [preview, setPreview] = React.useState<Row[]>([]);

  const [pdfLoading, setPdfLoading] = React.useState(false);

  async function loadMeta() {
    setMetaLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/cotizaciones/meta/customers"),
        fetch("/api/cotizaciones/meta/seasons"),
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();

      if (cRes.ok) setCustomerOptions(Array.isArray(cJson?.data) ? cJson.data : []);
      if (sRes.ok) setSeasonOptions(Array.isArray(sJson?.data) ? sJson.data : []);
    } finally {
      setMetaLoading(false);
    }
  }

  React.useEffect(() => {
    loadMeta();
  }, []);

  async function loadCompsBulk(varianteIds: string[]) {
    if (varianteIds.length === 0) {
      setCompsMap({});
      return;
    }
    setCompsLoading(true);
    try {
      const qs = encodeURIComponent(varianteIds.join(","));
      const res = await fetch(`/api/modelo-componentes/bulk?variante_ids=${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando composiciones");
      setCompsMap((json?.data || {}) as CompsMap);
    } catch (e: any) {
      setCompsMap({});
      setMsg(e?.message || "Error composiciones");
    } finally {
      setCompsLoading(false);
    }
  }

  // ✅ NUEVO: cargar fotos de variante en bulk
  async function loadImagesBulk(varianteIds: string[]) {
    if (varianteIds.length === 0) {
      setImagesMap({});
      return;
    }
    setImagesLoading(true);
    try {
      const qs = encodeURIComponent(varianteIds.join(","));
      const res = await fetch(`/api/modelo-imagenes/bulk?variante_ids=${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando imágenes");
      setImagesMap((json?.data || {}) as ImagesMap);
    } catch (e: any) {
      setImagesMap({});
      setMsg(e?.message || "Error imágenes");
    } finally {
      setImagesLoading(false);
    }
  }

  async function buscar() {
    setMsg("");
    setLoading(true);
    setPreview([]);
    setSelectedIds(new Set());
    setCompsMap({});
    setImagesMap({});
    try {
      if (!customer || !season) throw new Error("Selecciona Customer y Season.");

      const params = new URLSearchParams();
      params.set("customer", customer);
      params.set("season", season);
      if (status) params.set("status", status);
      params.set("limit", "200");
      params.set("offset", "0");

      const res = await fetch(`/api/cotizaciones/list?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error cargando cotizaciones");

      const list = Array.isArray(json?.data) ? (json.data as Row[]) : [];
      setRowsRaw(list);

      const latest = pickLatestByVariante(list);
      const varianteIds = latest.map((r) => r.variante_id).filter(Boolean);

      // composiciones
      if (includeComps) await loadCompsBulk(varianteIds);

      // ✅ fotos (si las mostramos)
      if (includePhotos) await loadImagesBulk(varianteIds);
    } catch (e: any) {
      setRowsRaw([]);
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(rows.map((r) => r.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  async function generarPreview() {
    const sel = rows.filter((r) => selectedIds.has(r.id));
    setPreview(sel);
    if (sel.length === 0) {
      setMsg("No has seleccionado ningún modelo/variante.");
      return;
    }
    setMsg("");

    const varianteIds = sel.map((r) => r.variante_id).filter(Boolean);

    if (includeComps) await loadCompsBulk(varianteIds);
    if (includePhotos) await loadImagesBulk(varianteIds);
  }

  function getComp(vid: string, kind: string) {
    return compsMap?.[vid]?.kinds?.[kind] || "";
  }

  function getModelo(r: Row) {
    return firstOrNull(r.modelos);
  }
  function getVariante(r: Row) {
    return firstOrNull(r.modelo_variantes);
  }

  // ✅ NUEVO: foto efectiva (variante si existe -> si no modelo base)
  function getPhotoUrl(r: Row) {
    const vid = String(r.variante_id || "");
    const fromVariant = vid ? imagesMap?.[vid] : "";
    const m = getModelo(r);
    return fromVariant || m?.picture_url || "";
  }

  function buildOfferTSV_ES(list: Row[]) {
    const lines: string[] = [];
    lines.push(`CUSTOMER:\t${customer}`);
    lines.push(`DATE:\t${offerDate}`);
    lines.push(`INCOTERM:\t${incoterm}`);
    lines.push(`${moq}`);
    lines.push("");

    const headersBase = ["STYLE", "REFERENCE", "COLOR", "SEASON", "SIZE RANGE"];
    const headersComps = includeComps
      ? ["UPPER", "LINING", "INSOLE", "OUTSOLE", "SHOELACE", "PACKAGING"]
      : [];
    const headersTail = ["PRICE", "CURRENCY"];
    const headers = [...headersBase, ...headersComps, ...headersTail];

    lines.push(headers.join("\t"));

    for (const r of list) {
      const m = getModelo(r);
      const v = getVariante(r);

      const base = [
        m?.style || "-",
        v?.reference || m?.reference || "-",
        v?.color || "-",
        v?.season || "-",
        m?.size_range || "-",
      ];

      const comps = includeComps
        ? [
            getComp(r.variante_id, "upper") || "-",
            getComp(r.variante_id, "lining") || "-",
            getComp(r.variante_id, "insole") || "-",
            getComp(r.variante_id, "outsole") || "-",
            getComp(r.variante_id, "shoelace") || "-",
            getComp(r.variante_id, "packaging") || "-",
          ]
        : [];

      const tail = [fmtMoneyES(r.sell_price), r.currency || "USD"];

      lines.push([...base, ...comps, ...tail].join("\t"));
    }

    return lines.join("\n");
  }

  async function copiar() {
    if (preview.length === 0) {
      setMsg("Genera primero la oferta (vista previa).");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildOfferTSV_ES(preview));
      setMsg("✅ Copiado al portapapeles (pégalo en email o Excel).");
    } catch {
      setMsg("No se pudo copiar. Usa el CSV.");
    }
  }

  function descargarCSV_ES() {
    if (preview.length === 0) {
      setMsg("Genera primero la oferta (vista previa).");
      return;
    }

    const exportRows = preview.map((r) => {
      const m = getModelo(r);
      const v = getVariante(r);

      return {
        CUSTOMER: customer,
        DATE: offerDate,
        INCOTERM: incoterm,
        MOQ: moq,
        STYLE: m?.style || "",
        REFERENCE: v?.reference || m?.reference || "",
        COLOR: v?.color || "",
        SEASON: v?.season || "",
        SIZE_RANGE: m?.size_range || "",
        UPPER: includeComps ? getComp(r.variante_id, "upper") : "",
        LINING: includeComps ? getComp(r.variante_id, "lining") : "",
        INSOLE: includeComps ? getComp(r.variante_id, "insole") : "",
        OUTSOLE: includeComps ? getComp(r.variante_id, "outsole") : "",
        SHOELACE: includeComps ? getComp(r.variante_id, "shoelace") : "",
        PACKAGING: includeComps ? getComp(r.variante_id, "packaging") : "",
        SELL: fmtMoneyES(r.sell_price),
        CURRENCY: r.currency || "USD",
        STATUS: r.status || "",
        LAST_QUOTE_AT: r.created_at,
        // ✅ si hay foto de variante, ponemos esa
        PICTURE_URL: includePhotos ? getPhotoUrl(r) : "",
      };
    });

    const headersBase = ["CUSTOMER", "DATE", "INCOTERM", "MOQ", "STYLE", "REFERENCE", "COLOR", "SEASON", "SIZE_RANGE"];
    const headersComps = includeComps
      ? ["UPPER", "LINING", "INSOLE", "OUTSOLE", "SHOELACE", "PACKAGING"]
      : [];
    const headersTail = ["SELL", "CURRENCY", "STATUS", "LAST_QUOTE_AT", "PICTURE_URL"];
    const headers = [...headersBase, ...headersComps, ...headersTail];

    const csv = "sep=;\n" + toCSV_ES(exportRows, headers);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `offer_${customer}_${season}_${offerDate}_ES.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function generarPDF() {
    if (preview.length === 0) {
      setMsg("Genera primero la oferta (vista previa).");
      return;
    }
    setMsg("");
    setPdfLoading(true);

    try {
      const payloadRows = preview.map((r) => {
        const m = getModelo(r);
        const v = getVariante(r);

        return {
          cotizacion_id: r.id,
          variante_id: r.variante_id,

          style: m?.style || "",
          reference: v?.reference || m?.reference || "",
          color: v?.color || "",
          season: v?.season || "",
          size_range: m?.size_range || "",
          currency: r.currency || "USD",
          sell_price: toNumber(r.sell_price),

          // ✅ ahora: variante primero, fallback a base
          picture_url: includePhotos ? getPhotoUrl(r) : "",

          comps: includeComps
            ? {
                upper: getComp(r.variante_id, "upper") || "",
                lining: getComp(r.variante_id, "lining") || "",
                insole: getComp(r.variante_id, "insole") || "",
                outsole: getComp(r.variante_id, "outsole") || "",
                shoelace: getComp(r.variante_id, "shoelace") || "",
                packaging: getComp(r.variante_id, "packaging") || "",
              }
            : null,
        };
      });

      const res = await fetch("/api/cotizaciones/oferta/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          season,
          date: offerDate,
          incoterm,
          moq,
          include_comps: includeComps,
          include_photos: includePhotos,
          rows: payloadRows,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        if (ct.includes("application/json")) {
          const json = await res.json();
          throw new Error(json?.error || "Error generando PDF");
        }
        const txt = await res.text();
        throw new Error(txt || "Error generando PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `offer_${customer}_${season}_${offerDate}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
      setMsg("✅ PDF generado.");
    } catch (e: any) {
      setMsg(e?.message || "Error generando PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📤 Oferta para cliente</h1>
        <div className="flex gap-2">
          <Link href="/desarrollo/cotizaciones" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            ← Cotizaciones
          </Link>
          <Link href="/desarrollo" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
            ← Desarrollo
          </Link>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border space-y-4">
        <div className="font-semibold">Cabecera</div>

        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm">Customer</label>
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? "Cargando..." : "(selecciona)"}</option>
              {customerOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? "Cargando..." : "(selecciona)"}</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Date</label>
            <input
              type="date"
              value={offerDate}
              onChange={(e) => setOfferDate(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="text-sm">Status (opcional)</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 w-full">
              <option value="">(todos)</option>
              <option value="enviada">enviada</option>
              <option value="negociando">negociando</option>
              <option value="aceptada">aceptada</option>
              <option value="rechazada">rechazada</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Incoterm</label>
            <input value={incoterm} onChange={(e) => setIncoterm(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="text-sm">MOQ</label>
            <input value={moq} onChange={(e) => setMoq(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeComps}
              onChange={async (e) => {
                const v = e.target.checked;
                setIncludeComps(v);
                if (v && rows.length > 0) await loadCompsBulk(rows.map((r) => r.variante_id));
              }}
            />
            Incluir composiciones
            {compsLoading ? <span className="text-xs text-gray-500">cargando…</span> : null}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={async (e) => {
                const v = e.target.checked;
                setIncludePhotos(v);
                if (v && rows.length > 0) await loadImagesBulk(rows.map((r) => r.variante_id));
              }}
            />
            Mostrar foto (variante si existe)
            {imagesLoading ? <span className="text-xs text-gray-500">cargando…</span> : null}
          </label>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button onClick={buscar} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" disabled={loading}>
            {loading ? "Cargando..." : "Cargar modelos"}
          </button>
        </div>

        {msg ? (
          <div className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-red-700"}`}>{msg}</div>
        ) : null}
      </div>

      <div className="bg-white p-5 rounded-xl shadow border space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={selectAll} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm">
            Seleccionar todo
          </button>
          <button onClick={clearAll} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm">
            Limpiar
          </button>
          <button onClick={generarPreview} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
            Generar oferta
          </button>

          <div className="ml-auto flex gap-2">
            <button onClick={copiar} className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-black text-sm">
              Copiar (Excel ES)
            </button>
            <button onClick={descargarCSV_ES} className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm">
              CSV (Excel ES)
            </button>

            <button
              onClick={generarPDF}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
              disabled={pdfLoading}
              title="Genera el PDF con la oferta seleccionada"
            >
              {pdfLoading ? "Generando PDF..." : "Generar PDF"}
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Sel</th>
                {includePhotos ? <th className="py-2 pr-3">Foto</th> : null}
                <th className="py-2 pr-3">Style</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-3">Color</th>
                <th className="py-2 pr-3">Season</th>
                <th className="py-2 pr-3">Size range</th>

                {includeComps ? (
                  <>
                    <th className="py-2 pr-3">Upper</th>
                    <th className="py-2 pr-3">Lining</th>
                    <th className="py-2 pr-3">Insole</th>
                    <th className="py-2 pr-3">Outsole</th>
                    <th className="py-2 pr-3">Shoelace</th>
                    <th className="py-2 pr-3">Packaging</th>
                  </>
                ) : null}

                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Moneda</th>
                <th className="py-2 pr-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = firstOrNull(r.modelos);
                const v = firstOrNull(r.modelo_variantes);
                const photo = includePhotos ? getPhotoUrl(r) : "";

                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-3">
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>

                    {includePhotos ? (
                      <td className="py-2 pr-3">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={m?.style || "foto"} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100 border" />
                        )}
                      </td>
                    ) : null}

                    <td className="py-2 pr-3">{m?.style || "-"}</td>
                    <td className="py-2 pr-3">{v?.reference || m?.reference || "-"}</td>
                    <td className="py-2 pr-3">{v?.color || "-"}</td>
                    <td className="py-2 pr-3">{v?.season || "-"}</td>
                    <td className="py-2 pr-3">{m?.size_range || "-"}</td>

                    {includeComps ? (
                      <>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "upper") || "-"}</td>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "lining") || "-"}</td>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "insole") || "-"}</td>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "outsole") || "-"}</td>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "shoelace") || "-"}</td>
                        <td className="py-2 pr-3">{getComp(r.variante_id, "packaging") || "-"}</td>
                      </>
                    ) : null}

                    <td className="py-2 pr-3 font-semibold">${fmtMoneyUI(r.sell_price)}</td>
                    <td className="py-2 pr-3">{r.currency || "USD"}</td>
                    <td className="py-2 pr-3 text-xs text-gray-600">{fmtDate(r.created_at)}</td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={(includePhotos ? 1 : 0) + (includeComps ? 16 : 10)} className="py-6 text-center text-gray-600">
                    Selecciona Customer + Season y pulsa “Cargar modelos”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {preview.length ? (
          <div className="text-sm text-gray-700">
            Vista previa: <b>{preview.length}</b> seleccionado(s).
          </div>
        ) : (
          <div className="text-sm text-gray-500">Genera oferta para preparar el copiar/CSV/PDF.</div>
        )}
      </div>
    </div>
  );
}