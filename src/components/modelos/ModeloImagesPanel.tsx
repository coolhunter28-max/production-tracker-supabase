// src/components/modelos/ModeloImagesPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ModeloImagen = {
  id: string;
  modelo_id: string;
  file_key: string;
  public_url: string | null;
  kind: "main" | "gallery" | "tech" | "other";
  sort_order: number;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function bytesToMB(bytes?: number | null) {
  if (!bytes) return "-";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ModeloImagesPanel({ modeloId }: { modeloId: string }) {
  const [items, setItems] = useState<ModeloImagen[]>([]);
  const [loading, setLoading] = useState(true);

  const [fileMain, setFileMain] = useState<File | null>(null);
  const [fileGallery, setFileGallery] = useState<File | null>(null);

  const [msg, setMsg] = useState<string>("");

  const mainImage = useMemo(
    () => items.find((i) => i.kind === "main") ?? null,
    [items]
  );

  const galleryImages = useMemo(
    () => items.filter((i) => i.kind !== "main"),
    [items]
  );

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/modelos/${modeloId}/imagenes`);
      const json = await res.json();
      if (!res.ok || json.status !== "ok") {
        throw new Error(json.error || "Error cargando imágenes");
      }
      setItems(json.items || []);
    } catch (e: any) {
      setMsg(e.message || "Error cargando imágenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modeloId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloId]);

  const upload = async (file: File, kind: "main" | "gallery") => {
    setMsg("");
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const res = await fetch(`/api/modelos/${modeloId}/imagenes/upload`, {
      method: "POST",
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || json.status !== "ok") {
      throw new Error(json.error || "Error subiendo imagen");
    }
  };

  const handleUploadMain = async () => {
    if (!fileMain) return;
    setLoading(true);
    try {
      await upload(fileMain, "main");
      setFileMain(null);
      await reload();
      setMsg("✅ Imagen principal actualizada.");
    } catch (e: any) {
      setMsg(`❌ ${e.message || "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadGallery = async () => {
    if (!fileGallery) return;
    setLoading(true);
    try {
      await upload(fileGallery, "gallery");
      setFileGallery(null);
      await reload();
      setMsg("✅ Imagen añadida a galería.");
    } catch (e: any) {
      setMsg(`❌ ${e.message || "Error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">📸 Imágenes del modelo</h2>
        <button
          onClick={reload}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          ↻ Recargar
        </button>
      </div>

      {msg ? (
        <div className="text-sm px-3 py-2 rounded bg-gray-50 border">{msg}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando imágenes…</div>
      ) : null}

      {/* MAIN */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="font-semibold text-sm text-gray-700">Imagen principal</div>

          <div className="border rounded-lg bg-gray-50 p-3">
            {mainImage?.public_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage.public_url}
                alt="Imagen principal"
                className="w-full rounded object-contain max-h-[280px] bg-white"
              />
            ) : (
              <div className="text-sm text-gray-500 italic">
                No hay imagen principal todavía.
              </div>
            )}

            <div className="mt-2 text-xs text-gray-600">
              {mainImage?.file_key ? (
                <>
                  <div>
                    <b>Key:</b> {mainImage.file_key}
                  </div>
                  <div>
                    <b>Tamaño:</b> {bytesToMB(mainImage.size_bytes)}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFileMain(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              onClick={handleUploadMain}
              disabled={!fileMain || loading}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
            >
              Subir MAIN
            </button>
          </div>
        </div>

        {/* GALLERY */}
        <div className="space-y-2">
          <div className="font-semibold text-sm text-gray-700">Galería</div>

          <div className="border rounded-lg bg-gray-50 p-3 min-h-[120px]">
            {galleryImages.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No hay imágenes en galería.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {galleryImages.map((img) => (
                  <a
                    key={img.id}
                    href={img.public_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                    title={img.file_key}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url || ""}
                      alt={img.file_key}
                      className="w-full h-28 object-cover rounded bg-white border"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFileGallery(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              onClick={handleUploadGallery}
              disabled={!fileGallery || loading}
              className="px-3 py-2 rounded bg-black hover:bg-gray-800 text-white text-sm disabled:opacity-50"
            >
              Añadir a galería
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
