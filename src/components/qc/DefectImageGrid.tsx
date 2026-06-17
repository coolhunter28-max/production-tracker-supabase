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
  images?: DefectPhoto[];
  inspectionId: string;
  defectId: string;
};

export function DefectImageGrid({
  images = [],
  inspectionId,
  defectId,
}: Props) {
  const [localImages, setLocalImages] = useState<DefectPhoto[]>(images);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const handleUploaded = (photo: DefectPhoto) => {
    setLocalImages((prev) => [...prev, photo]);
  };

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
      <div className="grid grid-cols-4 gap-2">
        {localImages.map((img, idx) => {
          const isDeleting = deletingId === img.id;

          return (
            <div
              key={img.id}
              className="group relative h-20 w-20 cursor-pointer"
            >
              <Image
                src={img.photo_url}
                alt="Defect image"
                fill
                unoptimized
                onClick={() => setLightboxIndex(idx)}
                className={`rounded object-cover transition ${
                  isDeleting ? "opacity-40" : "hover:opacity-90"
                }`}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(img.id);
                }}
                disabled={isDeleting}
                className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded border bg-white/90 text-xs shadow group-hover:flex"
                title="Delete"
              >
                ✕
              </button>

              {isDeleting ? (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-white/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="relative h-20 w-20">
          <UploadDefectImageButton
            inspectionId={inspectionId}
            defectId={defectId}
            onUploaded={handleUploaded}
          />
        </div>
      </div>

      {lightboxIndex !== null ? (
        <DefectImageLightbox
          photos={localImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}