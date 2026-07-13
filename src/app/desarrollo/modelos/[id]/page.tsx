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


type VarianteGroup = {
  key: string;
  color: string;
  reference: string;
  variants: Variante[];
  seasons: string[];
  factories: string[];
  statuses: string[];
};


type TimelineDetail = {
  label: string;
  value: string;
};

type TimelineEvent = {
  id: string;
  created_at: string;
  icon: string;
  title: string;
  subtitle: string;
  user_label: string;
  source_label: string;
  variant_label?: string | null;
  details: TimelineDetail[];
};

function formatTimelineDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function normalizeGroupValue(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || "-";
}

function varianteGroupKey(v: Variante) {
  return [
    normalizeGroupValue(v.color).toLowerCase(),
    normalizeGroupValue(v.reference).toLowerCase(),
  ].join("::");
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map(normalizeGroupValue).filter((v) => v !== "-"))].sort();
}

function sortBySeasonThenColor(a: Variante, b: Variante) {
  return (
    normalizeGroupValue(a.season).localeCompare(normalizeGroupValue(b.season)) ||
    normalizeGroupValue(a.color).localeCompare(normalizeGroupValue(b.color)) ||
    normalizeGroupValue(a.reference).localeCompare(normalizeGroupValue(b.reference))
  );
}

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
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Upload states (solo MAIN)
  const [mainFile, setMainFile] = useState<File | null>(null);

  // Variantes form (crear)
  const [vSeason, setVSeason] = useState("");
  const [vColor, setVColor] = useState("");
  const [vFactory, setVFactory] = useState("");
  const [vStatus, setVStatus] = useState("activo");
  const [vNotes, setVNotes] = useState("");

  // Variantes listado
  const [variantSearch, setVariantSearch] = useState("");
  const [variantSeasonFilter, setVariantSeasonFilter] = useState("");
  const [variantStatusFilter, setVariantStatusFilter] = useState("");
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Record<string, boolean>>({});

  // Variantes edit inline
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [varDraft, setVarDraft] = useState<any>({});

  const [msg, setMsg] = useState<string>("");

  const mainImage = useMemo(
    () => imagenes.find((i) => i.kind === "main") || null,
    [imagenes]
  );

  const variantSeasons = useMemo(
    () => uniqueSorted(variantes.map((v) => v.season)),
    [variantes]
  );

  const filteredVariantes = useMemo(() => {
    const search = variantSearch.trim().toLowerCase();

    return variantes.filter((v) => {
      if (variantSeasonFilter && v.season !== variantSeasonFilter) return false;
      if (variantStatusFilter && v.status !== variantStatusFilter) return false;

      if (!search) return true;

      const haystack = [
        v.season,
        v.color,
        v.reference,
        v.factory,
        v.status,
        v.notes,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return haystack.includes(search);
    });
  }, [variantes, variantSearch, variantSeasonFilter, variantStatusFilter]);

  const varianteGroups = useMemo<VarianteGroup[]>(() => {
    const map = new Map<string, VarianteGroup>();

    for (const v of filteredVariantes) {
      const key = varianteGroupKey(v);
      const existing = map.get(key);

      if (existing) {
        existing.variants.push(v);
      } else {
        map.set(key, {
          key,
          color: normalizeGroupValue(v.color),
          reference: normalizeGroupValue(v.reference),
          variants: [v],
          seasons: [],
          factories: [],
          statuses: [],
        });
      }
    }

    return [...map.values()]
      .map((group) => {
        const variants = [...group.variants].sort(sortBySeasonThenColor);
        return {
          ...group,
          variants,
          seasons: uniqueSorted(variants.map((v) => v.season)),
          factories: uniqueSorted(variants.map((v) => v.factory)),
          statuses: uniqueSorted(variants.map((v) => v.status)),
        };
      })
      .sort(
        (a, b) =>
          a.color.localeCompare(b.color) ||
          a.reference.localeCompare(b.reference)
      );
  }, [filteredVariantes]);

  const toggleVariantGroup = (key: string) => {
    setExpandedVariantGroups((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? false),
    }));
  };


  const loadTimeline = async () => {
    if (!id) return;

    setTimelineLoading(true);

    try {
      const res = await fetch(`/api/modelos/${id}/timeline`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        console.warn("⚠️ No se pudo cargar timeline:", json?.error);
        setTimeline([]);
        return;
      }

      setTimeline(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.warn("⚠️ Error cargando timeline:", e);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

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

      await loadTimeline();
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
          <h2 className="text-lg font-semibold">🧩 Variantes por color/reference</h2>
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
            Nota: en base de datos la variante sigue siendo modelo + season + color/reference. Aquí se agrupa visualmente por color/reference para simplificar la operativa.
          </div>
        </div>

        {/* Filtros */}
        <div className="grid gap-2 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <div className="text-[11px] text-gray-600">Buscar</div>
            <input
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              placeholder="Color, reference, factory..."
              className="w-full px-3 py-2 border rounded bg-white text-sm"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">Season</div>
            <select
              value={variantSeasonFilter}
              onChange={(e) => setVariantSeasonFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-white text-sm"
            >
              <option value="">Todas</option>
              {variantSeasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-gray-600">Status</div>
            <select
              value={variantStatusFilter}
              onChange={(e) => setVariantStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-white text-sm"
            >
              <option value="">Todos</option>
              <option value="activo">activo</option>
              <option value="inactivo">inactivo</option>
            </select>
          </div>
        </div>

        {/* Listado agrupado */}
        <div className="space-y-3">
          {varianteGroups.map((group) => {
            const expanded = expandedVariantGroups[group.key] ?? false;

            return (
              <div key={group.key} className="rounded-xl border bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleVariantGroup(group.key)}
                  className="w-full bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {expanded ? "▾" : "▸"} {group.color}
                        {group.reference !== "-" ? (
                          <span className="ml-2 text-gray-500">· Ref {group.reference}</span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        {group.seasons.length} season(s)
                        {group.seasons.length ? ` · ${group.seasons.join(", ")}` : ""}
                        {group.factories.length ? ` · Factory: ${group.factories.join(", ")}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {group.statuses.map((status) => (
                        <span
                          key={status}
                          className="rounded bg-white px-2 py-1 text-gray-700 border"
                        >
                          {status}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>

                {expanded ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Season</th>
                          <th className="text-left p-3">Color</th>
                          <th className="text-left p-3">Reference</th>
                          <th className="text-left p-3">Factory</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Acción</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.variants.map((v) => {
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
                                        setVarDraft((d: any) => ({
                                          ...d,
                                          season: e.target.value,
                                        }))
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
                                        setVarDraft((d: any) => ({
                                          ...d,
                                          color: e.target.value,
                                        }))
                                      }
                                      className="w-28 px-2 py-1 border rounded bg-white text-sm"
                                    />
                                  </div>
                                ) : (
                                  v.color || "-"
                                )}
                              </td>

                              <td className="p-3">{v.reference || "-"}</td>

                              <td className="p-3">
                                {editing ? (
                                  <div className="space-y-1">
                                    <div className="text-[11px] text-gray-500">Factory</div>
                                    <input
                                      value={varDraft.factory}
                                      onChange={(e) =>
                                        setVarDraft((d: any) => ({
                                          ...d,
                                          factory: e.target.value,
                                        }))
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
                                        setVarDraft((d: any) => ({
                                          ...d,
                                          status: e.target.value,
                                        }))
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
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}

          {varianteGroups.length === 0 ? (
            <div className="rounded border border-dashed p-4 text-center text-gray-500">
              No hay variantes con los filtros seleccionados.
            </div>
          ) : null}
        </div>
      </div>

      {/* ACTIVIDAD DEL MODELO */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">🕘 Actividad del modelo</h2>
            <p className="text-sm text-gray-600">
              Historial operativo registrado sobre este modelo y sus variantes.
            </p>
          </div>

          <button
            onClick={loadTimeline}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            ↻ Recargar
          </button>
        </div>

        {timelineLoading ? (
          <div className="rounded border border-dashed p-4 text-sm text-gray-500">
            Cargando actividad...
          </div>
        ) : timeline.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-sm text-gray-500">
            Todavía no hay eventos registrados para este modelo.
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.id} className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                      {event.icon}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold">{event.title}</div>
                        <span className="rounded bg-white px-2 py-0.5 text-xs text-gray-600 border">
                          {event.source_label}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-gray-700">{event.subtitle}</div>

                      {event.variant_label ? (
                        <div className="mt-1 text-xs text-gray-500">
                          Variante: {event.variant_label}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-600">
                    <div className="font-medium text-gray-800">
                      {formatTimelineDate(event.created_at)}
                    </div>
                    <div>{event.user_label}</div>
                  </div>
                </div>

                {event.details?.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {event.details.map((detail, index) => (
                      <div key={`${event.id}-${detail.label}-${index}`} className="rounded border bg-white px-3 py-2">
                        <div className="text-[11px] text-gray-500">{detail.label}</div>
                        <div className="text-sm font-medium text-gray-800">{detail.value}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
