// src/app/desarrollo/modelos/[id]/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Modelo = any;

type ModeloImagen = {
  id: string;
  modelo_id: string;
  variante_id?: string | null;
  public_url: string;
  file_key: string;
  kind: "main" | "gallery";
  size_bytes?: number | null;
  created_at?: string;
};

type Variante = {
  id: string;
  modelo_id: string;
  season: string;
  color: string | null;
  factory: string | null;
  reference: string | null;
  notes: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

function formatMB(bytes?: number | null) {
  if (!bytes) return "-";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ModeloDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const router = useRouter();

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [imagenes, setImagenes] = useState<ModeloImagen[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload states (solo MAIN)
  const [mainFile, setMainFile] = useState<File | null>(null);

  // Variantes form (crear)
  const [vSeason, setVSeason] = useState("");
  const [vColor, setVColor] = useState("");
  const [vFactory, setVFactory] = useState("");
  const [vStatus, setVStatus] = useState("activo");
  const [vNotes, setVNotes] = useState("");

  // Variantes edit inline
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [varDraft, setVarDraft] = useState<any>({});

  const [msg, setMsg] = useState<string>("");

  const mainImage = useMemo(
    () => imagenes.find((i) => i.kind === "main") || null,
    [imagenes]
  );

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setMsg("");

    try {
      // 1) Cargar MODELO
      const mRes = await fetch(`/api/modelos/${id}`, { cache: "no-store" });
      const mJson = await mRes.json();
      if (!mRes.ok) throw new Error(mJson?.error || "Error cargando modelo");
      setModelo(mJson);

      // 2) Cargar IMÁGENES (SOLO MODELO: variante_id IS NULL)
      try {
        const iRes = await fetch(`/api/modelos/${id}/imagenes`, {
          cache: "no-store",
        });
        const iJson = await iRes.json();
        if (!iRes.ok) {
          console.warn("⚠️ No se pudieron cargar imágenes:", iJson?.error);
          setImagenes([]);
        } else {
          setImagenes(Array.isArray(iJson) ? iJson : iJson?.data || []);
        }
      } catch (e) {
        console.warn("⚠️ Error cargando imágenes:", e);
        setImagenes([]);
      }

      // 3) Cargar VARIANTES
      try {
        const vRes = await fetch(`/api/modelos/${id}/variantes`, {
          cache: "no-store",
        });
        const vJson = await vRes.json();
        if (!vRes.ok) {
          console.warn("⚠️ No se pudieron cargar variantes:", vJson?.error);
          setVariantes([]);
        } else {
          setVariantes(Array.isArray(vJson) ? vJson : vJson?.data || []);
        }
      } catch (e) {
        console.warn("⚠️ Error cargando variantes:", e);
        setVariantes([]);
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ " + (e?.message || "Error"));
      setModelo(null);
      setImagenes([]);
      setVariantes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Subir MAIN (en el backend ahora se fuerza a main igualmente)
  const uploadMain = async () => {
    if (!mainFile) return;

    setMsg("");

    try {
      const form = new FormData();
      form.append("kind", "main"); // aunque el backend lo ignora y fuerza main
      form.append("file", mainFile);

      const res = await fetch(`/api/modelos/${id}/imagenes/upload`, {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error subiendo imagen");

      setMsg("✅ Imagen principal actualizada.");
      setMainFile(null);
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deleteMainImage = async (imageId: string) => {
    const ok = confirm("¿Seguro que quieres eliminar la imagen principal?");
    if (!ok) return;

    setMsg("");

    try {
      const res = await fetch(`/api/modelos/${id}/imagenes/${imageId}`, {
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

  const createVariante = async () => {
    setMsg("");
    try {
      const body = {
        season: vSeason.trim(),
        color: vColor.trim(),
        factory: vFactory.trim() || null,
        status: vStatus.trim() || "activo",
        notes: vNotes.trim() || null,
      };

      const res = await fetch(`/api/modelos/${id}/variantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error creando variante");

      setMsg("✅ Variante creada.");
      setVSeason("");
      setVColor("");
      setVFactory("");
      setVStatus("activo");
      setVNotes("");

      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const startEditVar = (v: Variante) => {
    setEditingVarId(v.id);
    setVarDraft({
      season: v.season ?? "",
      color: v.color ?? "",
      factory: v.factory ?? "",
      status: v.status ?? "activo",
      notes: v.notes ?? "",
    });
  };

  const cancelEditVar = () => {
    setEditingVarId(null);
    setVarDraft({});
  };

  const saveVar = async (varId: string) => {
    setMsg("");
    try {
      const body = {
        season: String(varDraft.season || "").trim(),
        color: String(varDraft.color || "").trim() || null,
        factory: String(varDraft.factory || "").trim() || null,
        status: String(varDraft.status || "").trim() || "activo",
        notes: String(varDraft.notes || "").trim() || null,
      };

      if (!body.season) {
        setMsg("❌ season is required");
        return;
      }

      const res = await fetch(`/api/variantes/${varId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error actualizando variante");

      setMsg("✅ Variante actualizada.");
      cancelEditVar();
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deleteVar = async (varId: string) => {
    const ok = confirm(
      "¿Eliminar esta variante?\n\nSe borrarán también sus componentes y precios (ON DELETE CASCADE)."
    );
    if (!ok) return;

    setMsg("");
    try {
      const res = await fetch(`/api/variantes/${varId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error eliminando variante");

      setMsg("🗑️ Variante eliminada.");
      if (editingVarId === varId) cancelEditVar();
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  if (!modelo) {
    return (
      <div className="p-8 space-y-3">
        <div className="text-red-600 font-semibold">Modelo no encontrado</div>
        {msg ? (
          <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div>
        ) : null}
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
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛠️ Modelo: {modelo.style}</h1>

        <div className="flex gap-2">
          <Link
            href={`/desarrollo/modelos/${id}/editar`}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition text-sm"
          >
            ✏️ Editar modelo
          </Link>

          <button
            onClick={() => router.push("/desarrollo/modelos")}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition text-sm"
          >
            ← Volver
          </button>
        </div>
      </div>

      {msg ? (
        <div className="text-sm bg-gray-50 border rounded p-2">{msg}</div>
      ) : null}

      {/* INFO */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="font-semibold">Style:</span> {modelo.style || "-"}
          </div>
          <div>
            <span className="font-semibold">Customer:</span>{" "}
            {modelo.customer || "-"}
          </div>
          <div>
            <span className="font-semibold">Supplier:</span>{" "}
            {modelo.supplier || "-"}
          </div>

          <div>
            <span className="font-semibold">Factory:</span>{" "}
            {modelo.factory || "-"}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {modelo.status || "-"}
          </div>
          <div>
            <span className="font-semibold">Size range:</span>{" "}
            {modelo.size_range || "-"}
          </div>
        </div>
      </div>

      {/* IMÁGEN PRINCIPAL (MODELO) */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🖼️ Imagen principal del modelo</h2>
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            ↻ Recargar
          </button>
        </div>

        <div className="space-y-3">
          <div className="border rounded-lg p-3 bg-gray-50">
            {mainImage ? (
              <div className="space-y-2">
                <div className="relative w-full h-[260px] bg-white rounded overflow-hidden">
                  <Image
                    src={mainImage.public_url}
                    alt="Main"
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="text-xs text-gray-700">
                  <div>
                    <span className="font-semibold">Key:</span> {mainImage.file_key}
                  </div>
                  <div>
                    <span className="font-semibold">Tamaño:</span>{" "}
                    {formatMB(mainImage.size_bytes)}
                  </div>
                </div>

                <button
                  onClick={() => deleteMainImage(mainImage.id)}
                  className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-500 text-sm"
                >
                  🗑️ Eliminar MAIN
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No hay imagen principal todavía.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setMainFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={uploadMain}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
              disabled={!mainFile}
            >
              Subir MAIN
            </button>
          </div>

          <div className="text-xs text-gray-600">
            Nota: la galería ya no vive en el modelo. Las imágenes se suben dentro de cada variante.
          </div>
        </div>
      </div>

      {/* VARIANTES */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🧩 Variantes (Season + Color)</h2>
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            ↻ Recargar
          </button>
        </div>

        {/* Crear variante */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="text-sm font-semibold">Crear nueva variante</div>

          <div className="grid md:grid-cols-5 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Season *</div>
              <input
                value={vSeason}
                onChange={(e) => setVSeason(e.target.value)}
                placeholder="SS26"
                className="w-full px-3 py-2 border rounded bg-white text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Color *</div>
              <input
                value={vColor}
                onChange={(e) => setVColor(e.target.value)}
                placeholder="CHI"
                className="w-full px-3 py-2 border rounded bg-white text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">Factory</div>
              <input
                value={vFactory}
                onChange={(e) => setVFactory(e.target.value)}
                placeholder="(opcional)"
                className="w-full px-3 py-2 border rounded bg-white text-sm"
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

            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">&nbsp;</div>
              <button
                onClick={createVariante}
                className="w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
                disabled={!vSeason.trim() || !vColor.trim()}
                title="Requiere season + color"
              >
                ➕ Crear
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">Notes</div>
            <textarea
              value={vNotes}
              onChange={(e) => setVNotes(e.target.value)}
              placeholder="(opcional)"
              className="w-full px-3 py-2 border rounded bg-white text-sm"
              rows={2}
            />
          </div>

          <div className="text-xs text-gray-600">
            Nota: (modelo_id, season, color) es único. Si ya existe te dará error.
          </div>
        </div>

        {/* Listado */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Season</th>
                <th className="text-left p-3">Color</th>
                <th className="text-left p-3">Factory</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {variantes.map((v) => {
                const editing = editingVarId === v.id;

                return (
                  <tr key={v.id} className="border-t align-top">
                    <td className="p-3 font-semibold">
                      {editing ? (
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Season *</div>
                          <input
                            value={varDraft.season}
                            onChange={(e) =>
                              setVarDraft((d: any) => ({ ...d, season: e.target.value }))
                            }
                            className="w-32 px-2 py-1 border rounded bg-white text-sm"
                          />
                        </div>
                      ) : (
                        v.season
                      )}
                    </td>

                    <td className="p-3">
                      {editing ? (
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Color</div>
                          <input
                            value={varDraft.color}
                            onChange={(e) =>
                              setVarDraft((d: any) => ({ ...d, color: e.target.value }))
                            }
                            className="w-28 px-2 py-1 border rounded bg-white text-sm"
                          />
                        </div>
                      ) : (
                        v.color || "-"
                      )}
                    </td>

                    <td className="p-3">
                      {editing ? (
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Factory</div>
                          <input
                            value={varDraft.factory}
                            onChange={(e) =>
                              setVarDraft((d: any) => ({ ...d, factory: e.target.value }))
                            }
                            className="w-40 px-2 py-1 border rounded bg-white text-sm"
                          />
                        </div>
                      ) : (
                        v.factory || "-"
                      )}
                    </td>

                    <td className="p-3">
                      {editing ? (
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Status</div>
                          <select
                            value={varDraft.status}
                            onChange={(e) =>
                              setVarDraft((d: any) => ({ ...d, status: e.target.value }))
                            }
                            className="w-28 px-2 py-1 border rounded bg-white text-sm"
                          >
                            <option value="activo">activo</option>
                            <option value="inactivo">inactivo</option>
                          </select>
                        </div>
                      ) : (
                        v.status || "-"
                      )}
                    </td>

                    <td className="p-3">
                      {editing ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => saveVar(v.id)}
                            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 text-xs"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelEditVar}
                            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/desarrollo/variantes/${v.id}`}
                            className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800 text-xs"
                          >
                            Ver variante
                          </Link>
                          <button
                            onClick={() => startEditVar(v)}
                            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteVar(v.id)}
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

              {variantes.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    Aún no hay variantes.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
