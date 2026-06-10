"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";

const ROLES = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] as const;

export async function createUserAction(formData: FormData) {
  const { admin } = await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "OPERATOR").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email) throw new Error("Email is required.");
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error("Invalid role.");
  if (!password || password.length < 8) {
    throw new Error("Temporary password must have at least 8 characters.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (createError) throw new Error(createError.message);
  if (!created.user) throw new Error("User was not created.");

  const { error: profileError } = await admin.from("user_profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName || null,
    role,
    is_active: true,
  });

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin/usuarios");
}

export async function updateUserProfileAction(formData: FormData) {
  const { admin } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "OPERATOR").trim();
  const isActive = formData.get("is_active") === "on";

  if (!id) throw new Error("User id is required.");
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error("Invalid role.");

  const { error } = await admin.from("user_profiles").upsert({
    id,
    email,
    full_name: fullName || null,
    role,
    is_active: isActive,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

export async function assignCustomerAction(formData: FormData) {
  const { admin } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const customer = String(formData.get("customer") ?? "").trim();

  if (!userId) throw new Error("User id is required.");
  if (!customer) throw new Error("Customer is required.");

  const { error } = await admin.from("user_customer_assignments").upsert(
    {
      user_id: userId,
      customer,
      is_active: true,
    },
    {
      onConflict: "user_id,customer",
    }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}

export async function removeCustomerAssignmentAction(formData: FormData) {
  const { admin } = await requireAdmin();

  const assignmentId = String(formData.get("assignment_id") ?? "");

  if (!assignmentId) throw new Error("Assignment id is required.");

  const { error } = await admin
    .from("user_customer_assignments")
    .update({ is_active: false })
    .eq("id", assignmentId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}