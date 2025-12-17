"use client";

export function UploadDefectImageButton({
  inspectionId,
  defectId,
}: {
  inspectionId: string;
  defectId: string;
}) {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("inspection_id", inspectionId);
    formData.append("defect_id", defectId);

    await fetch("/api/qc/defects/upload", {
      method: "POST",
      body: formData,
    });
  };

  return (
    <label className="flex items-center justify-center w-20 h-20 border rounded cursor-pointer hover:bg-gray-50">
      +
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) =>
          e.target.files && handleUpload(e.target.files[0])
        }
      />
    </label>
  );
}
