import "server-only";

import { createClient } from "@/lib/supabase";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("No authenticated user.");
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "ADMIN" || !profile.is_active) {
    throw new Error("Admin permission required.");
  }

  return { user, admin };
}