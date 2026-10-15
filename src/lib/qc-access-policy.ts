import type { CurrentUserAccess } from "@/lib/ownership";

export type QcCustomerAccessResult =
  | { allowed: true }
  | { allowed: false; status: 403; error: "Forbidden" };

export function normalizeQcCustomer(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function evaluateQcCustomerAccess(
  access: CurrentUserAccess,
  canonicalCustomer: string | null | undefined,
  inspectionCustomer?: string | null
): QcCustomerAccessResult {
  if (access.role === "ADMIN" || access.role === "MANAGER") {
    return { allowed: true };
  }

  if (access.role !== "OPERATOR") {
    return { allowed: false, status: 403, error: "Forbidden" };
  }

  const normalizedCanonical = normalizeQcCustomer(canonicalCustomer);
  if (!normalizedCanonical) {
    return { allowed: false, status: 403, error: "Forbidden" };
  }

  const normalizedInspection = normalizeQcCustomer(inspectionCustomer);
  if (normalizedInspection && normalizedInspection !== normalizedCanonical) {
    return { allowed: false, status: 403, error: "Forbidden" };
  }

  const allowedCustomers = new Set(
    access.customers.map((customer) => normalizeQcCustomer(customer))
  );

  return allowedCustomers.has(normalizedCanonical)
    ? { allowed: true }
    : { allowed: false, status: 403, error: "Forbidden" };
}
