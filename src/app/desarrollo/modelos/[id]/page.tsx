"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Modelo = any;

type ModeloImagen = {
  id: string;
  modelo_id: string;
  public_url: string;
  file_key: string;
  kind: "main" | "gallery";
  size_bytes?: number | null;
  created_at?: string;
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
  const [loading, setLoading] = useState(true);

  // Upload states
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);

  const [msg, setMsg] = useState<string>("");

  const mainImage = useMemo(
    () => imagenes.find((i) => i.kind === "main") || null,
    [imagenes]
  );

  const gallery = useMemo(
    () => imagenes.filter((i) => i.kind === "gallery"),
    [imagenes]
  );

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setMsg("");

    try {
      // 1) Cargar MODELO (si esto falla, entonces sí: "Modelo no encontrado")
      const mRes = await fetch(`/api/modelos/${id}`, { cache: "no-store" });
      const mJson = await mRes.json();

      if (!mRes.ok) throw new Error(mJson?.error || "Error cargando modelo");

      setModelo(mJson);

      // 2) Cargar IMÁGENES (si esto falla, NO tumbamos el modelo)
      try {
        const iRes = await fetch(`/api/modelos/${id}/imagenes`, {
          cache: "no-store",
        });

        const iJson = await iRes.json();

        if (!iRes.ok) {
          // No rompemos la pantalla si el endpoint no existe todavía
          console.warn("⚠️ No se pudieron cargar imágenes:", iJson?.error);
          setImagenes([]);
          setMsg("⚠️ Modelo cargado, pero no se pudieron cargar las imágenes (endpoint /imagenes).");
        } else {
          setImagenes(Array.isArray(iJson) ? iJson : iJson?.data || []);
        }
      } catch (e) {
        console.warn("⚠️ Error cargando imágenes:", e);
        setImagenes([]);
        setMsg("⚠️ Modelo cargado, pero no se pudieron cargar las imágenes (endpoint /imagenes).");
      }
    } catch (e: any) {
      console.error(e);
      setMsg("❌ " + (e?.message || "Error"));
      setModelo(null);
      setImagenes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const upload = async (kind: "main" | "gallery", file: File | null) => {
    if (!file) return;

    setMsg("");

    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);

      const res = await fetch(`/api/modelos/${id}/imagenes/upload`, {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error subiendo imagen");

      setMsg(
        kind === "main"
          ? "✅ Imagen principal actualizada."
          : "✅ Imagen añadida a galería."
      );

      setMainFile(null);
      setGalleryFile(null);
      await load();
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Error"));
    }
  };

  const deleteImage = async (imageId: string) => {
    const ok = confirm("¿Seguro que quieres eliminar esta imagen?");
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

  if (loading) return <div className="p-8">Cargando...</div>;

  // ✅ Importante: si no hay modelo, mostramos también el mensaje de error
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

      {/* IMÁGENES */}
      <div className="bg-white rounded-xl shadow p-5 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">🖼️ Imágenes del modelo</h2>
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
          >
            ↻ Recargar
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* MAIN */}
          <div className="space-y-3">
            <h3 className="font-semibold">Imagen principal</h3>

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
                      <span className="font-semibold">Key:</span>{" "}
                      {mainImage.file_key}
                    </div>
                    <div>
                      <span className="font-semibold">Tamaño:</span>{" "}
                      {formatMB(mainImage.size_bytes)}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteImage(mainImage.id)}
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
                onClick={() => upload("main", mainFile)}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
                disabled={!mainFile}
              >
                Subir MAIN
              </button>
            </div>
          </div>

          {/* GALLERY */}
          <div className="space-y-3">
            <h3 className="font-semibold">Galería</h3>

            <div className="border rounded-lg p-3 bg-gray-50">
              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="border rounded bg-white overflow-hidden p-2 space-y-2"
                    >
                      <div className="relative w-full h-[120px]">
                        <Image
                          src={img.public_url}
                          alt="Gallery"
                          fill
                          className="object-contain"
                        />
                      </div>

                      <div className="text-[11px] text-gray-700">
                        {formatMB(img.size_bytes)}
                      </div>

                      <button
                        onClick={() => deleteImage(img.id)}
                        className="w-full px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600 italic">
                  Aún no hay imágenes en la galería.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setGalleryFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => upload("gallery", galleryFile)}
                className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 text-sm disabled:opacity-50"
                disabled={!galleryFile}
              >
                Añadir a galería
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
