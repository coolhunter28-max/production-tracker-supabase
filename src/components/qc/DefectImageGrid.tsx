"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UploadDefectImageButton } from "./UploadDefectImageButton";
import { DefectImageLightbox } from "./DefectImageLightbox";

type DefectPhoto = {
  id: string;
  photo_url: string;
};

type Props = {
  images?: DefectPhoto[]; // 👈 ahora opcional
  inspectionId: string;
  defectId: string;
};

export function DefectImageGrid({
  images = [], // 👈 fallback seguro
  inspectionId,
  defectId,
}: Props) {
  // Estado local de imágenes
  const [localImages, setLocalImages] = useState<DefectPhoto[]>(images);

  // Mantener sincronizado si cambian las props
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  // UX states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* ---------- Upload ---------- */
  const handleUploaded = (photo: DefectPhoto) => {
    setLocalImages((prev) => [...prev, photo]);
    setUploading(false);
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;

    setDeletingId(photoId);

    const res = await fetch(`/api/qc/defects/photos/${photoId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Delete failed");
      setDeletingId(null);
      return;
    }

    setLocalImages((prev) => prev.filter((p) => p.id !== photoId));
    setDeletingId(null);
  };

  return (
    <>
      {/* GRID */}
      <div className="grid grid-cols-4 gap-2">
        {localImages.map((img, idx) => {
          const isDeleting = deletingId === img.id;

          return (
            <div
              key={img.id}
              className="relative w-20 h-20 group cursor-pointer"
            >
              <Image
                src={img.photo_url}
                alt="Defect image"
                fill
                unoptimized
                onClick={() => setLightboxIndex(idx)}
                className={`object-cover rounded transition ${
                  isDeleting ? "opacity-40" : "hover:opacity-90"
                }`}
              />

              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(img.id);
                }}
                disabled={isDeleting}
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded bg-white/90 border text-xs shadow"
                title="Delete"
              >
                ✕
              </button>

              {/* Spinner al borrar */}
              {isDeleting && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-white/50">
                  <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          );
        })}

        {/* Upload slot */}
        <div className="relative w-20 h-20">
          <UploadDefectImageButton
            inspectionId={inspectionId}
            defectId={defectId}
            onUploadStart={() => setUploading(true)}
            onUploaded={handleUploaded}
          />

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded bg-white/70 border">
              <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
        <DefectImageLightbox
          photos={localImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
