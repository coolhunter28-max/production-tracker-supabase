"use client";

import { useState } from "react";
import { DefectImageGrid } from "./DefectImageGrid";
import { EditActionPlanModal } from "./EditActionPlanModal";

export function DefectBlock({
  defect,
  inspectionId,
}: {
  defect: any;
  inspectionId: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="font-semibold">
        {defect.defect_id} – {defect.defect_type}
      </div>

      <div className="text-sm text-gray-500">
        Qty: {defect.defect_quantity}
      </div>

      <div className="text-sm">
        Description: {defect.defect_description}
      </div>

      {/* Action plan */}
      <div className="mt-2 rounded border bg-gray-50 p-3 text-sm space-y-1">
        <div className="font-medium flex justify-between">
          Action Plan
          <button
            onClick={() => setEditing(true)}
            className="text-blue-600 text-xs hover:underline"
          >
            Edit
          </button>
        </div>
        <div>Plan: {defect.action_plan || "—"}</div>
        <div>Owner: {defect.action_owner || "—"}</div>
        <div>
          Due: {defect.action_due_date || "—"} | Status:{" "}
          <span className="font-medium">{defect.action_status}</span>
        </div>
      </div>

<DefectImageGrid
  images={defect.qc_defect_photos || []}
  inspectionId={inspectionId}
  defectId={defect.id}
/>

      {editing && (
        <EditActionPlanModal
          defect={defect}
          onClose={() => setEditing(false)}
          onSaved={() => location.reload()}
        />
      )}
    </div>
  );
}
