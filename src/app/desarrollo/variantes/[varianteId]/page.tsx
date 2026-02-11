// src/app/desarrollo/variantes/[varianteId]/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Variante = any;

type Componente = {
  id: string;
  modelo_id: string;
  variante_id: string;
  kind: string;
  slot: number;
  catalogo_id: string | null;
  percentage: number | null;
  quality: string | null;
  material_text: string | null;
  extra: string | null;
  created_at?: string;
};

type Precio = {
  id: string;
  modelo_id: string;
  variante_id: string;
  season: string;
  currency: string;
  buy_price: number;
  sell_price: number | null;
  valid_from: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

type VarianteImagen = {
  id: string;
  modelo_id: string;
  variante_id: string;
  public_url: string;
  file_key: string;
  kind: "main" | "gallery" | "tech" | "other";
  size_bytes?: number | null;
  mime_type?: string | null;
  created_at?: string;
};

const KINDS = ["upper", "lining", "insole", "shoelace", "outsole", "packaging", "other"];

function formatMB(bytes?: number | null) {
  if (!bytes) return "-";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function VariantePage() {
  const params = useParams<{ varianteId: string }>();
  const varianteId = params?.varianteId || "";
  const router = useRouter();

  const [tab, setTab] = useState<"componentes" | "precios" | "imagenes">("componentes");

  const [variante, setVariante] = useState<Variante | null>(null);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [imagenes, setImagenes] = useState<VarianteImagen[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // --- editar variante (cabecera)
  const [editVar, setEditVar] = useState(false);
  const [vSeason, setVSeason] = useState("");
  const [vColor, setVColor] = useState("");
  const [vReference, setVReference] = useState(""); // ✅ NUEVO
  const [vFactory, setVFactory] = useState("");
  const [vStatus, setVStatus] = useState("activo");
  const [vNotes, setVNotes] = useState("");

  // Form componente NUEVO
  const [cKind, setCKind] = useState("upper");
  const [cSlot, setCSlot] = useState(1);
  const [cMaterial, setCMaterial] = useState("");
  const [cPercentage, setCPercentage] = useState<number | "">("");
  const [cExtra, setCExtra] = useState("");

  // Form precio NUEVO
  const [pBuy, setPBuy] = useState<number | "">("");
  const [pSell, setPSell] = useState<number | "">("");
  const [pCurrency, setPCurrency] = useState("EUR");
  const [pSeason, setPSeason] = useState("");
  const [pValidFrom, setPValidFrom] = useState(""); // yyyy-mm-dd
  const [pNotes, setPNotes] = useState("");

  // editar por fila
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compDraft, setCompDraft] = useState<any>({});

  const [editingPrecioId, setEditingPrecioId] = useState<string | null>(null);
  const [precioDraft, setPrecioDraft] = useState<any>({});

  // Upload imágenes
  const [imgFile, setImgFile] = useState<File | null>(null);

  const title = useMemo(() => {
    if (!variante) return "Variante";
    const color = variante.color ? ` · ${variante.color}` : "";
    return `${variante.season}${color}`;
  }, [variante]);

  const load = async () => {
    if (!varianteId) return;

    setLoading(true);
    setMsg("");

    try {
      // Variante
      const vRes = await fetch(`/api/variantes/${varianteId}`, { cache: "no-store" });
      const vJson = await vRes.json();
      if (!vRes.ok) throw new Error(vJson?.error || "Error cargando variante");
      setVariante(vJson);

      // sincronizar draft cabecera
      setVSeason(vJson?.season || "");
      setVColor(vJson?.color || "");
      setVReference(vJson?.reference || ""); // ✅ NUEVO
      setVFactory(vJson?.factory || "");
      setVStatus(vJson?.status || "activo");
      setVNotes(vJson?.notes || "");
      setPSeason(vJson?.season || "");

      // Componentes
      try {
        const cRes = await fetch(`/api/variantes/${varianteId}/componentes`, { cache: "no-store" });
        const cJson = await cRes.json();
        setComponentes(cRes.ok ? (Array.isArray(cJson) ? cJson : cJson?.data || []) : []);
      } catch {
        setComponentes([]);
      }

      // Precios
      try {
        const pRes = await fetch(`/api/variantes/${varianteId}/precios`, { cache: "no-store" });
        const pJson = await pRes.json();
        setPrecios(pRes.ok ? (Array.isArray(pJson) ? pJson : pJson?.data || []) : []);
      } catch {
        setPrecios([]);
      }

      // Imágenes
      try {
        const iRes = await fetch(`/api/variantes/${varianteId}/imagenes`, { cache: "no-store" });
        const iJson = await iRes.json();
        setImagenes(iRes.ok ? (Array.isArray(iJson) ? iJson : iJson?.data || []) : []);
      } catch {
        setImagenes([]);
      }
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
      setVariante(null);
      setComponentes([]);
      setPrecios([]);
      setImagenes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varianteId]);

  // ----------------- VARIANTE (PATCH) -----------------
  const saveVariante = async () => {
    if (!varianteId) return;
    setMsg("");
    try {
      const body = {
        season: vSeason.trim(),
        color: vColor.trim() || null,
        reference: vReference.trim() || null, // ✅ NUEVO
        factory: vFactory.trim() || null,
        status: vStatus.trim() || "activo",
        notes: vNotes.trim() || null,
      };

      const res = await fetch(`/api/variantes/${varianteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error actualizando variante");

      setMsg("✅ Variante actualizada.");
      setEditVar(false);
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  // ----------------- COMPONENTES -----------------
  const addComponente = async () => {
    setMsg("");
    try {
      const body = {
        kind: cKind,
        slot: Number(cSlot) || 1,
        material_text: cMaterial.trim() || null,
        percentage: cPercentage === "" ? null : Number(cPercentage),
        extra: cExtra.trim() || null,
      };

      const res = await fetch(`/api/variantes/${varianteId}/componentes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error creando componente");

      setMsg("✅ Componente añadido.");
      setCMaterial("");
      setCPercentage("");
      setCExtra("");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const startEditComp = (c: Componente) => {
    setEditingCompId(c.id);
    setCompDraft({
      kind: c.kind,
      slot: c.slot,
      material_text: c.material_text ?? "",
      percentage: c.percentage ?? "",
      extra: c.extra ?? "",
    });
  };

  const cancelEditComp = () => {
    setEditingCompId(null);
    setCompDraft({});
  };

  const saveComp = async (compId: string) => {
    setMsg("");
    try {
      const body = {
        kind: compDraft.kind,
        slot: Number(compDraft.slot) || 1,
        material_text: String(compDraft.material_text || "").trim() || null,
        percentage: compDraft.percentage === "" ? null : Number(compDraft.percentage),
        extra: String(compDraft.extra || "").trim() || null,
      };

      const res = await fetch(`/api/variantes/${varianteId}/componentes/${compId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error actualizando componente");

      setMsg("✅ Componente actualizado.");
      cancelEditComp();
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deleteComponente = async (compId: string) => {
    const ok = confirm("¿Eliminar este componente?");
    if (!ok) return;

    setMsg("");
    try {
      const res = await fetch(`/api/variantes/${varianteId}/componentes/${compId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error eliminando componente");

      setMsg("🗑️ Componente eliminado.");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  // ----------------- PRECIOS -----------------
  const addPrecio = async () => {
    setMsg("");
    try {
      const body: any = {
        buy_price: pBuy,
        sell_price: pSell === "" ? null : pSell,
        currency: pCurrency,
        season: pSeason,
        notes: pNotes.trim() || null,
      };
      if (pValidFrom.trim()) body.valid_from = pValidFrom.trim();

      const res = await fetch(`/api/variantes/${varianteId}/precios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error creando precio");

      setMsg("✅ Precio creado.");
      setPBuy("");
      setPSell("");
      setPNotes("");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const startEditPrecio = (p: Precio) => {
    setEditingPrecioId(p.id);
    setPrecioDraft({
      season: p.season ?? "",
      currency: p.currency ?? "EUR",
      buy_price: p.buy_price ?? "",
      sell_price: p.sell_price ?? "",
      valid_from: p.valid_from ?? "",
      notes: p.notes ?? "",
    });
  };

  const cancelEditPrecio = () => {
    setEditingPrecioId(null);
    setPrecioDraft({});
  };

  const savePrecio = async (precioId: string) => {
    setMsg("");
    try {
      const body: any = {
        season: String(precioDraft.season || "").trim(),
        currency: String(precioDraft.currency || "EUR").trim() || "EUR",
        buy_price: precioDraft.buy_price,
        sell_price: precioDraft.sell_price === "" ? null : precioDraft.sell_price,
        valid_from: String(precioDraft.valid_from || "").trim() || null,
        notes: String(precioDraft.notes || "").trim() || null,
      };

      if (!body.valid_from) delete body.valid_from;

      const res = await fetch(`/api/variantes/${varianteId}/precios/${precioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error actualizando precio");

      setMsg("✅ Precio actualizado.");
      cancelEditPrecio();
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deletePrecio = async (precioId: string) => {
    const ok = confirm("¿Eliminar este precio?");
    if (!ok) return;

    setMsg("");
    try {
      const res = await fetch(`/api/variantes/${varianteId}/precios/${precioId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error eliminando precio");

      setMsg("🗑️ Precio eliminado.");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  // ----------------- IMÁGENES -----------------
  const uploadImagen = async () => {
    if (!imgFile) return;
    setMsg("");
    try {
      const form = new FormData();
      form.append("kind", "gallery");
      form.append("file", imgFile);

      const res = await fetch(`/api/variantes/${varianteId}/imagenes/upload`, {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error subiendo imagen");

      setMsg("✅ Imagen añadida a la variante.");
      setImgFile(null);
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deleteImagen = async (imageId: string) => {
    const ok = confirm("¿Eliminar esta imagen de la variante?");
    if (!ok) return;

    setMsg("");
    try {
      const res = await fetch(`/api/variantes/${varianteId}/imagenes/${imageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error eliminando imagen");

      setMsg("🗑️ Imagen eliminada.");
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  // ----------------- render -----------------
  if (loading) return <div className="p-8">Cargando…</div>;

  if (!variante) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-red-600 font-semibold">Variante no encontrada</div>
        {msg ? <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div> : null}
        <button
          onClick={() => router.push("/desarrollo/modelos")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
        >
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧩 Variante: {title}</h1>

        <div className="flex gap-2">
          <Link
            href={`/desarrollo/modelos/${variante.modelo_id}`}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver al modelo
          </Link>
        </div>
      </div>

      {msg ? <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div> : null}

      {/* Cabecera variante */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 text-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Datos de la variante</div>
          {!editVar ? (
            <button
              onClick={() => setEditVar(true)}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs"
            >
              ✏️ Editar variante
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveVariante}
                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500 text-xs"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditVar(false);
                  setVSeason(variante.season || "");
                  setVColor(variante.color || "");
                  setVReference(variante.reference || ""); // ✅ NUEVO
                  setVFactory(variante.factory || "");
                  setVStatus(variante.status || "activo");
                  setVNotes(variante.notes || "");
                }}
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-xs"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {!editVar ? (
          <div className="grid md:grid-cols-5 gap-3">
            <div><span className="font-semibold">Season:</span> {variante.season}</div>
            <div><span className="font-semibold">Color:</span> {variante.color || "-"}</div>
            <div><span className="font-semibold">Reference:</span> {variante.reference || "-"}</div>
            <div><span className="font-semibold">Factory:</span> {variante.factory || "-"}</div>
            <div><span className="font-semibold">Status:</span> {variante.status || "-"}</div>

            {variante.notes ? (
              <div className="md:col-span-5 text-gray-700">
                <span className="font-semibold">Notes:</span> {variante.notes}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Season *</div>
              <input
                value={vSeason}
                onChange={(e) => setVSeason(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="season"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Color</div>
              <input
                value={vColor}
                onChange={(e) => setVColor(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="color"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Reference</div>
              <input
                value={vReference}
                onChange={(e) => setVReference(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="reference"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Factory</div>
              <input
                value={vFactory}
                onChange={(e) => setVFactory(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="factory"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Status</div>
              <select
                value={vStatus}
                onChange={(e) => setVStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
              >
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </div>

            <div className="md:col-span-5 space-y-1">
              <div className="text-[11px] text-gray-600">Notes</div>
              <textarea
                value={vNotes}
                onChange={(e) => setVNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                rows={2}
                placeholder="notes"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("componentes")}
          className={`px-4 py-2 rounded text-sm border ${
            tab === "componentes" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Composición
        </button>
        <button
          onClick={() => setTab("precios")}
          className={`px-4 py-2 rounded text-sm border ${
            tab === "precios" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Precios
        </button>
        <button
          onClick={() => setTab("imagenes")}
          className={`px-4 py-2 rounded text-sm border ${
            tab === "imagenes" ? "bg-black text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Imágenes
        </button>
      </div>

      {/* COMPONENTES */}
      {tab === "componentes" ? (
        <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold">🧵 Composición de la variante</h2>

          {/* Form nuevo */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="grid md:grid-cols-5 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Kind</div>
                <select
                  value={cKind}
                  onChange={(e) => setCKind(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Slot</div>
                <input
                  type="number"
                  value={cSlot}
                  min={1}
                  onChange={(e) => setCSlot(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="slot"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Material</div>
                <input
                  value={cMaterial}
                  onChange={(e) => setCMaterial(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="material_text"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">%</div>
                <input
                  type="number"
                  value={cPercentage}
                  onChange={(e) =>
                    setCPercentage(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="%"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">&nbsp;</div>
                <button
                  onClick={addComponente}
                  className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm"
                >
                  ➕ Añadir
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Extra</div>
              <input
                value={cExtra}
                onChange={(e) => setCExtra(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="extra"
              />
            </div>

            <div className="text-xs text-gray-600">
              unique por (variante_id, kind, slot). Si repites slot te dará error.
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Kind</th>
                  <th className="text-left p-3">Slot</th>
                  <th className="text-left p-3">Material</th>
                  <th className="text-left p-3">%</th>
                  <th className="text-left p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {componentes.map((c) => {
                  const editing = editingCompId === c.id;

                  return (
                    <tr key={c.id} className="border-t align-top">
                      <td className="p-3 font-semibold">
                        {editing ? (
                          <select
                            value={compDraft.kind}
                            onChange={(e) =>
                              setCompDraft((d: any) => ({ ...d, kind: e.target.value }))
                            }
                            className="px-2 py-1 border rounded bg-white text-sm"
                          >
                            {KINDS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        ) : (
                          c.kind
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            type="number"
                            min={1}
                            value={compDraft.slot}
                            onChange={(e) =>
                              setCompDraft((d: any) => ({
                                ...d,
                                slot: Number(e.target.value),
                              }))
                            }
                            className="w-20 px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          c.slot
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="text-[11px] text-gray-500">Material</div>
                              <input
                                value={compDraft.material_text}
                                onChange={(e) =>
                                  setCompDraft((d: any) => ({
                                    ...d,
                                    material_text: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white text-sm"
                                placeholder="material_text"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="text-[11px] text-gray-500">Extra</div>
                              <input
                                value={compDraft.extra}
                                onChange={(e) =>
                                  setCompDraft((d: any) => ({ ...d, extra: e.target.value }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white text-sm"
                                placeholder="extra"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>{c.material_text || "-"}</div>
                            {c.extra ? (
                              <div className="text-xs text-gray-600">{c.extra}</div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            type="number"
                            value={compDraft.percentage}
                            onChange={(e) =>
                              setCompDraft((d: any) => ({
                                ...d,
                                percentage:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                            className="w-24 px-2 py-1 border rounded bg-white text-sm"
                            placeholder="%"
                          />
                        ) : (
                          c.percentage ?? "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveComp(c.id)}
                              className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelEditComp}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditComp(c)}
                              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteComponente(c.id)}
                              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {componentes.length === 0 ? (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={5}>
                      No hay componentes todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* PRECIOS */}
      {tab === "precios" ? (
        <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold">💶 Precios de la variante</h2>

          {/* Form nuevo */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="grid md:grid-cols-6 gap-2">
              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Buy</div>
                <input
                  type="number"
                  value={pBuy}
                  onChange={(e) =>
                    setPBuy(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="buy_price"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Sell</div>
                <input
                  type="number"
                  value={pSell}
                  onChange={(e) =>
                    setPSell(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="sell_price"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Currency</div>
                <input
                  value={pCurrency}
                  onChange={(e) => setPCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="currency"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Season *</div>
                <input
                  value={pSeason}
                  onChange={(e) => setPSeason(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="season"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">Valid from</div>
                <input
                  type="date"
                  value={pValidFrom}
                  onChange={(e) => setPValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  title="valid_from (si lo dejas vacío, será hoy y puede duplicar)"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-gray-600">&nbsp;</div>
                <button
                  onClick={addPrecio}
                  className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
                  disabled={pBuy === "" || !pSeason.trim()}
                  title="Requiere buy_price y season"
                >
                  ➕ Añadir
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Notes</div>
              <input
                value={pNotes}
                onChange={(e) => setPNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="notes"
              />
            </div>

            <div className="text-xs text-gray-600">
              Regla: 1 precio por variante y día (unique: variante_id + valid_from).
              Si quieres “cambiar precio hoy”, edita el registro de hoy.
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Valid from</th>
                  <th className="text-left p-3">Season</th>
                  <th className="text-left p-3">Buy</th>
                  <th className="text-left p-3">Sell</th>
                  <th className="text-left p-3">Currency</th>
                  <th className="text-left p-3">Notes</th>
                  <th className="text-left p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {precios.map((p) => {
                  const editing = editingPrecioId === p.id;

                  return (
                    <tr key={p.id} className="border-t align-top">
                      <td className="p-3">
                        {editing ? (
                          <input
                            type="date"
                            value={precioDraft.valid_from}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({
                                ...d,
                                valid_from: e.target.value,
                              }))
                            }
                            className="px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          p.valid_from
                        )}
                      </td>

                      <td className="p-3 font-semibold">
                        {editing ? (
                          <input
                            value={precioDraft.season}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({ ...d, season: e.target.value }))
                            }
                            className="px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          p.season
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            type="number"
                            value={precioDraft.buy_price}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({
                                ...d,
                                buy_price:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                            className="w-24 px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          p.buy_price
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            type="number"
                            value={precioDraft.sell_price}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({
                                ...d,
                                sell_price:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              }))
                            }
                            className="w-24 px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          p.sell_price ?? "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            value={precioDraft.currency}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({
                                ...d,
                                currency: e.target.value,
                              }))
                            }
                            className="w-20 px-2 py-1 border rounded bg-white text-sm"
                          />
                        ) : (
                          p.currency
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <input
                            value={precioDraft.notes}
                            onChange={(e) =>
                              setPrecioDraft((d: any) => ({ ...d, notes: e.target.value }))
                            }
                            className="w-full px-2 py-1 border rounded bg-white text-sm"
                            placeholder="notes"
                          />
                        ) : (
                          p.notes || "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => savePrecio(p.id)}
                              className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelEditPrecio}
                              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditPrecio(p)}
                              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deletePrecio(p.id)}
                              className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {precios.length === 0 ? (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={7}>
                      No hay precios todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* IMÁGENES */}
      {tab === "imagenes" ? (
        <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🖼️ Imágenes de la variante</h2>
            <button
              onClick={load}
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              ↻ Recargar
            </button>
          </div>

          {/* Upload */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
            <div className="text-sm font-semibold">Añadir imagen</div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImgFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={uploadImagen}
                disabled={!imgFile}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
              >
                Subir a variante
              </button>
            </div>

            <div className="text-xs text-gray-600">
              Estas imágenes quedan ligadas a <b>variante_id</b> (no pueden ser “random”).
            </div>
          </div>

          {/* Grid */}
          <div className="border rounded-lg p-3 bg-gray-50">
            {imagenes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imagenes.map((img) => (
                  <div
                    key={img.id}
                    className="border rounded bg-white overflow-hidden p-2 space-y-2"
                  >
                    <div className="relative w-full h-[140px] bg-white">
                      <Image
                        src={img.public_url}
                        alt="Variante"
                        fill
                        className="object-contain"
                      />
                    </div>

                    <div className="text-[11px] text-gray-700">
                      <div><span className="font-semibold">Kind:</span> {img.kind}</div>
                      <div><span className="font-semibold">Size:</span> {formatMB(img.size_bytes)}</div>
                    </div>

                    <button
                      onClick={() => deleteImagen(img.id)}
                      className="w-full px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-xs"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                Aún no hay imágenes en esta variante.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
