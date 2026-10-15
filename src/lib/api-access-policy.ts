import type { CurrentUserAccess, UserRole } from "@/lib/ownership";

export type ApiAccessDenial = {
  allowed: false;
  status: 401 | 403;
  error: "Unauthorized" | "Forbidden";
};

export type ApiAccessGrant = {
  allowed: true;
  access: CurrentUserAccess;
};

export function evaluateApiAccess(
  access: CurrentUserAccess,
  roles: readonly UserRole[]
): ApiAccessDenial | ApiAccessGrant {
  if (!access.userId) {
    return { allowed: false, status: 401, error: "Unauthorized" };
  }

  if (!access.isActive || !roles.includes(access.role)) {
    return { allowed: false, status: 403, error: "Forbidden" };
  }

  return { allowed: true, access };
}
