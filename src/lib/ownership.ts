import "server-only";

import { createClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER" | "DEVELOPMENT";

export type AppArea =
  | "COMMAND_CENTER"
  | "FICHA_CLIENTE"
  | "PRODUCCION"
  | "QC"
  | "ANALYTICS"
  | "DESARROLLO"
  | "SISTEMA"
  | "ADMIN";

export type CurrentUserAccess = {
  userId: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  canAdmin: boolean;
  canSeeAllCustomers: boolean;
  customers: string[];
};

const ROLE_VALUES: UserRole[] = [
  "ADMIN",
  "MANAGER",
  "OPERATOR",
  "VIEWER",
  "DEVELOPMENT",
];

function normalizeRole(value?: string | null): UserRole {
  const role = String(value ?? "VIEWER").toUpperCase();

  if (ROLE_VALUES.includes(role as UserRole)) {
    return role as UserRole;
  }

  return "VIEWER";
}

export function canAccessAdmin(role: UserRole) {
  return role === "ADMIN";
}

export function canAccessAnalytics(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "VIEWER";
}

export function canAccessDevelopment(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "DEVELOPMENT";
}

export function canAccessSystem(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canAccessOperational(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "OPERATOR" || role === "VIEWER";
}

export function canAccessQC(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "OPERATOR" || role === "VIEWER";
}

export function canEditOperational(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "OPERATOR";
}

export function canEditQC(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "OPERATOR";
}

export function canAccessArea(role: UserRole, area: AppArea) {
  if (area === "COMMAND_CENTER") return true;
  if (area === "FICHA_CLIENTE") return true;
  if (area === "PRODUCCION") return canAccessOperational(role);
  if (area === "QC") return canAccessQC(role);
  if (area === "ANALYTICS") return canAccessAnalytics(role);
  if (area === "DESARROLLO") return canAccessDevelopment(role);
  if (area === "SISTEMA") return canAccessSystem(role);
  if (area === "ADMIN") return canAccessAdmin(role);

  return false;
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      email: null,
      role: "VIEWER",
      isActive: false,
      canAdmin: false,
      canSeeAllCustomers: false,
      customers: [],
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, email, role, is_active")
    .eq("id", user.id)
    .single();

  const role = normalizeRole(profile?.role);
  const isActive = Boolean(profile?.is_active);

  const { data: assignments } = await admin
    .from("user_customer_assignments")
    .select("customer")
    .eq("user_id", user.id)
    .eq("is_active", true);

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? null,
    role,
    isActive,
    canAdmin: isActive && canAccessAdmin(role),
    canSeeAllCustomers: isActive && (role === "ADMIN" || role === "MANAGER" || role === "VIEWER"),
    customers: (assignments ?? []).map((row) => row.customer).filter(Boolean),
  };
}
