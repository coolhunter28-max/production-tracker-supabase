"use client";

import { useState } from "react";

export function EditActionPlanModal({
  defect,
  onClose,
  onSaved,
}: {
  defect: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState(defect.action_plan || "");
  const [owner, setOwner] = useState(defect.action_owner || "");
  const [dueDate, setDueDate] = useState(defect.action_due_date || "");
  const [status, setStatus] = useState(defect.action_status || "open");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);

    const res = await fetch(`/api/qc/defects/${defect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_plan: plan,
        action_owner: owner,
        action_due_date: dueDate || null,
        action_status: status,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      alert("Save failed");
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded w-[420px] p-4 space-y-4">
        <h3 className="font-semibold text-lg">Edit Action Plan</h3>

        <div className="space-y-2">
          <label className="text-sm">Plan</label>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={3}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Owner</label>
          <input
            className="w-full border rounded p-2 text-sm"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm">Due date</label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label className="text-sm">Status</label>
            <select
              className="w-full border rounded p-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1 text-sm bg-black text-white rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
