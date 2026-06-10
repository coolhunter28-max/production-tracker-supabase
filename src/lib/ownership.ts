import "server-only";

import { createClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";

export type CurrentUserAccess = {
  userId: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  canAdmin: boolean;
  canSeeAllCustomers: boolean;
  customers: string[];
};

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

  const role = (profile?.role ?? "VIEWER") as UserRole;
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
    canAdmin: isActive && role === "ADMIN",
    canSeeAllCustomers: isActive && role === "ADMIN",
    customers: (assignments ?? []).map((row) => row.customer).filter(Boolean),
  };
}