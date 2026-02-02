// src/app/desarrollo/variantes/[varianteId]/page.tsx
"use client";

import Link from "next/link";
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

const KINDS = ["upper", "lining", "insole", "shoelace", "outsole", "packaging", "other"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] font-semibold text-gray-600">{label}</div>
      {children}
    </div>
  );
}

export default function VariantePage() {
  const params = useParams<{ varianteId: string }>();
  const varianteId = params?.varianteId || "";
  const router = useRouter();

  const [tab, setTab] = useState<"componentes" | "precios">("componentes");

  const [variante, setVariante] = useState<Variante | null>(null);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // --- editar variante (cabecera)
  const [editVar, setEditVar] = useState(false);
  const [vSeason, setVSeason] = useState("");
  const [vColor, setVColor] = useState("");
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
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
      setVariante(null);
      setComponentes([]);
      setPrecios([]);
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

      // Si valid_from viene vacío, no lo mandamos
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
                  // restaurar desde variante actual
                  setVSeason(variante.season || "");
                  setVColor(variante.color || "");
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
          <div className="grid md:grid-cols-4 gap-3">
            <div><span className="font-semibold">Season:</span> {variante.season}</div>
            <div><span className="font-semibold">Color:</span> {variante.color || "-"}</div>
            <div><span className="font-semibold">Factory:</span> {variante.factory || "-"}</div>
            <div><span className="font-semibold">Status:</span> {variante.status || "-"}</div>
            {variante.notes ? (
              <div className="md:col-span-4 text-gray-700">
                <span className="font-semibold">Notes:</span> {variante.notes}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-3">
            <Field label="Season">
              <input
                value={vSeason}
                onChange={(e) => setVSeason(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="SS26"
              />
            </Field>

            <Field label="Color">
              <input
                value={vColor}
                onChange={(e) => setVColor(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="CHI"
              />
            </Field>

            <Field label="Factory">
              <input
                value={vFactory}
                onChange={(e) => setVFactory(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
                placeholder="factory"
              />
            </Field>

            <Field label="Status">
              <select
                value={vStatus}
                onChange={(e) => setVStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white text-sm"
              >
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </Field>

            <div className="md:col-span-4">
              <Field label="Notes">
                <textarea
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  rows={3}
                  placeholder="notes"
                />
              </Field>
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
      </div>

      {/* COMPONENTES */}
      {tab === "componentes" ? (
        <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold">🧵 Composición de la variante</h2>

          {/* Form nuevo */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="grid md:grid-cols-5 gap-3 items-end">
              <Field label="Kind">
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
              </Field>

              <Field label="Slot">
                <input
                  type="number"
                  value={cSlot}
                  min={1}
                  onChange={(e) => setCSlot(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="1"
                />
              </Field>

              <Field label="Material">
                <input
                  value={cMaterial}
                  onChange={(e) => setCMaterial(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="material_text (opcional)"
                />
              </Field>

              <Field label="%">
                <input
                  type="number"
                  value={cPercentage}
                  onChange={(e) =>
                    setCPercentage(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="% (opcional)"
                />
              </Field>

              <button
                onClick={addComponente}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm"
              >
                ➕ Añadir
              </button>
            </div>

            <Field label="Extra">
              <input
                value={cExtra}
                onChange={(e) => setCExtra(e.target.value)}
                className="px-3 py-2 border rounded bg-white text-sm w-full"
                placeholder="extra (opcional)"
              />
            </Field>

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
                            <input
                              value={compDraft.extra}
                              onChange={(e) =>
                                setCompDraft((d: any) => ({
                                  ...d,
                                  extra: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border rounded bg-white text-sm"
                              placeholder="extra"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>{c.material_text || "-"}</div>
                            {c.extra ? <div className="text-xs text-gray-600">{c.extra}</div> : null}
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
                                percentage: e.target.value === "" ? "" : Number(e.target.value),
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
            <div className="grid md:grid-cols-6 gap-3 items-end">
              <Field label="Buy price">
                <input
                  type="number"
                  value={pBuy}
                  onChange={(e) => setPBuy(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="buy_price"
                />
              </Field>

              <Field label="Sell price">
                <input
                  type="number"
                  value={pSell}
                  onChange={(e) => setPSell(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="sell_price"
                />
              </Field>

              <Field label="Currency">
                <input
                  value={pCurrency}
                  onChange={(e) => setPCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="EUR"
                />
              </Field>

              <Field label="Season">
                <input
                  value={pSeason}
                  onChange={(e) => setPSeason(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  placeholder="SS26"
                />
              </Field>

              <Field label="Valid from">
                <input
                  type="date"
                  value={pValidFrom}
                  onChange={(e) => setPValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white text-sm"
                  title="valid_from (si lo dejas vacío, será hoy y puede duplicar)"
                />
              </Field>

              <button
                onClick={addPrecio}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
                disabled={pBuy === "" || !pSeason.trim()}
                title="Requiere buy_price y season"
              >
                ➕ Añadir
              </button>
            </div>

            <Field label="Notes">
              <input
                value={pNotes}
                onChange={(e) => setPNotes(e.target.value)}
                className="px-3 py-2 border rounded bg-white text-sm w-full"
                placeholder="notes (opcional)"
              />
            </Field>

            <div className="text-xs text-gray-600">
              Regla: 1 precio por variante y día (unique: variante_id + valid_from).
              Si quieres “cambiar precio hoy”, edita el registro de hoy (botón Editar).
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
                                buy_price: e.target.value === "" ? "" : Number(e.target.value),
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
                                sell_price: e.target.value === "" ? "" : Number(e.target.value),
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
    </div>
  );
}
