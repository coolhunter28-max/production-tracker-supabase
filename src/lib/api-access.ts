import "server-only";

import { NextResponse } from "next/server";
import { evaluateApiAccess } from "@/lib/api-access-policy";
import { getCurrentUserAccess, type UserRole } from "@/lib/ownership";

export async function requireApiAccess(options: {
  roles: readonly UserRole[];
}) {
  const result = evaluateApiAccess(await getCurrentUserAccess(), options.roles);

  if (!result.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: result.error },
        { status: result.status }
      ),
    };
  }

  return { ok: true as const, access: result.access };
}
