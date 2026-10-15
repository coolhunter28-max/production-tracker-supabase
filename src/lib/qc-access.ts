import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUserAccess } from "@/lib/ownership";
import { evaluateQcCustomerAccess } from "@/lib/qc-access-policy";

export async function requireQcDefectAccess(options: {
  access: CurrentUserAccess;
  defectId: string;
  supabase: SupabaseClient;
}) {
  const { access, defectId, supabase } = options;

  if (access.role === "ADMIN" || access.role === "MANAGER") {
    return { ok: true as const };
  }

  const { data: defect, error } = await supabase
    .from("qc_defects")
    .select(`
      id,
      inspection:qc_inspections (
        id,
        customer,
        po:pos (
          id,
          customer
        )
      )
    `)
    .eq("id", defectId)
    .single();

  if (error || !defect) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Defect not found" }, { status: 404 }),
    };
  }

  const inspection = (defect as any).inspection;
  const po = inspection?.po;
  const result = evaluateQcCustomerAccess(
    access,
    po?.customer,
    inspection?.customer
  );

  if (!po?.id || !result.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}
