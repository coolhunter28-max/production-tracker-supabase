"use client";

import { useRef, useState } from "react";

type UploadedPhoto = {
  id: string;
  photo_url: string;
};

export function UploadDefectImageButton({
  inspectionId,
  defectId,
  onUploaded,
}: {
  inspectionId: string;
  defectId: string;
  onUploaded?: (photo: UploadedPhoto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
formData.append("defect_id", defectId);

// contexto para R2 path
formData.append("po", inspectionId); // o po_number si lo tienes
formData.append("reference", "");
formData.append("style", "");
formData.append("color", "");


      const res = await fetch("/api/qc/defects/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const json = await res.json();

      if (!json?.id || !json?.photo_url) {
        throw new Error("Invalid response");
      }

      // 👉 Avisamos al grid
      onUploaded?.(json);
    } catch (err) {
      console.error(err);
      alert("Upload failed: invalid response");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 border rounded flex items-center justify-center text-xl hover:bg-gray-50 disabled:opacity-50"
        title="Upload photo"
      >
        {uploading ? "…" : "+"}
      </button>
    </>
  );
}
