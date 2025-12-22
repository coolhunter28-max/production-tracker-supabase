import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const defectId = params.id;
    const body = await req.json();

    const {
      action_plan,
      action_owner,
      action_due_date,
      action_status,
      reopen,
    } = body;

    const update: any = {};

    /* ---------- REOPEN ---------- */
    if (reopen === true) {
      update.action_status = "open";
      update.action_closed_at = null;
    } else {
      update.action_plan = action_plan;
      update.action_owner = action_owner;
      update.action_due_date = action_due_date;
      update.action_status = action_status;

      if (action_status === "closed") {
        update.action_closed_at = new Date()
          .toISOString()
          .slice(0, 10);
      }
    }

    const { error } = await supabase
      .from("qc_defects")
      .update(update)
      .eq("id", defectId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Action plan update error:", e);
    return NextResponse.json(
      { error: "Failed to update action plan" },
      { status: 500 }
    );
  }
}
