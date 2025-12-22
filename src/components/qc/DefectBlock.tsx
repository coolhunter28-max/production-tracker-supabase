"use client";

import { useState } from "react";
import { DefectImageGrid } from "./DefectImageGrid";
import { EditActionPlanModal } from "./EditActionPlanModal";

export default function DefectBlock({
  defect,
  inspectionId,
}: {
  defect: any;
  inspectionId: string;
}) {
  const [editing, setEditing] = useState(false);

  const isClosed =
    (defect.action_status || "").toLowerCase() === "closed";

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-semibold">
        {defect.defect_id} – {defect.defect_type}
      </div>

      <div className="text-sm text-gray-500">
        Qty: {defect.defect_quantity}
      </div>

      <div className="text-sm">
        Description: {defect.defect_description || "—"}
      </div>

      {/* ACTION PLAN */}
      <div className="rounded border bg-gray-50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <div className="font-medium">Action Plan</div>

          {!isClosed && (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 text-xs hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        <div>Plan: {defect.action_plan || "—"}</div>
        <div>Owner: {defect.action_owner || "—"}</div>
        <div>
          Due: {defect.action_due_date || "—"} | Status:{" "}
          <b>{defect.action_status || "—"}</b>
        </div>

        {isClosed && defect.action_closed_at && (
          <div className="text-xs text-gray-500">
            Closed on: {defect.action_closed_at}
          </div>
        )}
      </div>

      {/* HISTORY */}
      {defect.qc_defect_action_logs?.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-gray-600 hover:underline">
            View action history ({defect.qc_defect_action_logs.length})
          </summary>

          <div className="mt-2 space-y-2 border-l pl-3">
            {[...defect.qc_defect_action_logs]
              .sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((log: any) => (
                <div
                  key={log.id}
                  className="rounded bg-gray-50 p-2 text-xs"
                >
                  <div className="text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  <div>Plan: {log.action_plan || "—"}</div>
                  <div>Owner: {log.action_owner || "—"}</div>
                  <div>Due: {log.action_due_date || "—"}</div>
                  <div>Status: {log.action_status || "—"}</div>
                </div>
              ))}
          </div>
        </details>
      )}

      {/* IMAGES */}
      <DefectImageGrid
        images={defect.qc_defect_photos || []}
        inspectionId={inspectionId}
        defectId={defect.id}
      />

      {editing && !isClosed && (
        <EditActionPlanModal
          defect={defect}
          onClose={() => setEditing(false)}
          onSaved={() => location.reload()}
        />
      )}
    </div>
  );
}
