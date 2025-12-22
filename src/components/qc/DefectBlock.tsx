"use client";

import { useState } from "react";
import { DefectImageGrid } from "./DefectImageGrid";
import { EditActionPlanModal } from "./EditActionPlanModal";

/* -------------------------------------------------
 * STATUS HELPERS
 * ------------------------------------------------- */
function getEffectiveStatus(defect: any) {
  const { action_status, action_due_date } = defect;

  if (
    action_status !== "closed" &&
    action_due_date &&
    new Date(action_due_date) < new Date()
  ) {
    return "overdue";
  }

  return action_status || "open";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    closed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? styles.open
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

/* -------------------------------------------------
 * COMPONENT
 * ------------------------------------------------- */
export function DefectBlock({
  defect,
  inspectionId,
}: {
  defect: any;
  inspectionId: string;
}) {
  const [editing, setEditing] = useState(false);

  const effectiveStatus = getEffectiveStatus(defect);
  const isClosed = effectiveStatus === "closed";

  return (
    <div className="border rounded p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 border-b pb-2">
        <div>
          <div className="font-semibold">
            {defect.defect_id} – {defect.defect_type}
          </div>

          <div className="text-sm text-gray-500">
            Qty: {defect.defect_quantity}
          </div>
        </div>

        <StatusBadge status={effectiveStatus} />
      </div>

      {/* DESCRIPTION */}
      <div className="text-sm">
        Description: {defect.defect_description}
      </div>

      {/* ACTION PLAN */}
<div className="rounded border bg-gray-50 p-3 text-sm space-y-1 mt-2">
        <div className="flex justify-between items-start">
<div className="font-medium text-gray-700">Action Plan</div>

{effectiveStatus === "closed" ? (
  <button
    onClick={() => {
      if (!confirm("Reopen this action plan?")) return;
      setEditing(true);
    }}
    className="text-orange-600 text-xs font-medium hover:underline"
  >
    Reopen
  </button>
) : (
  <button
    onClick={() => setEditing(true)}
    className={`text-xs font-medium hover:underline ${
      effectiveStatus === "overdue"
        ? "text-red-600"
        : "text-blue-600"
    }`}
  >
    Edit
  </button>
)}
        </div>

        <div>Plan: {defect.action_plan || "—"}</div>
        <div>Owner: {defect.action_owner || "—"}</div>
<div>
  Due: {defect.action_due_date || "—"}
</div>

        {defect.action_closed_at && (
          <div className="text-xs text-gray-500">
            Closed on: {defect.action_closed_at}
          </div>
        )}
      </div>

      {/* IMAGES */}
      <DefectImageGrid
        images={defect.qc_defect_photos || []}
        inspectionId={inspectionId}
        defectId={defect.id}
      />

      {/* MODAL */}
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
