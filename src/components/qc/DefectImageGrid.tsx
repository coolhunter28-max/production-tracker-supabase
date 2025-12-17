"use client";

import Image from "next/image";
import { useState } from "react";
import { UploadDefectImageButton } from "./UploadDefectImageButton";

export function DefectImageGrid({
  images,
  inspectionId,
  defectId,
}: {
  images: any[];
  inspectionId: string;
  defectId: string;
}) {
  const [localImages, setLocalImages] = useState(images);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;

    setDeletingId(photoId);

    const res = await fetch(`/api/qc/defects/photos/${photoId}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!res.ok) {
      alert("Delete failed");
      return;
    }

    // Quitarla del grid sin F5
    setLocalImages((prev) => prev.filter((p) => p.id !== photoId));
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {localImages.map((img) => (
        <div key={img.id} className="relative w-20 h-20 group">
          <Image
            src={img.photo_url}
            alt="Defect image"
            fill
            unoptimized
            className="object-cover rounded"
          />

          <button
            type="button"
            onClick={() => handleDelete(img.id)}
            disabled={deletingId === img.id}
            className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded bg-white/90 border text-xs"
            title="Delete"
          >
            {deletingId === img.id ? "…" : "✕"}
          </button>
        </div>
      ))}

      <UploadDefectImageButton
        inspectionId={inspectionId}
        defectId={defectId}
      />
    </div>
  );
}
