import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/permissions";
import {
  assignCustomerAction,
  createUserAction,
  removeCustomerAssignmentAction,
  updateUserProfileAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
  is_active: boolean;
};

type Assignment = {
  id: string;
  user_id: string;
  customer: string;
  is_active: boolean;
};

const ROLES = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"];

async function getAdminUsersData() {
  const { admin } = await requireAdmin();

  const [authUsersResult, profilesResult, assignmentsResult, customersResult] =
    await Promise.all([
      admin.auth.admin.listUsers(),
      admin.from("user_profiles").select("*").order("email"),
      admin
        .from("user_customer_assignments")
        .select("*")
        .eq("is_active", true)
        .order("customer"),
      admin
        .from("vw_customer_campaign_board_v1")
        .select("customer")
        .not("customer", "is", null),
    ]);

  if (authUsersResult.error) throw new Error(authUsersResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);
  if (customersResult.error) throw new Error(customersResult.error.message);

  const authUsers = authUsersResult.data.users;
  const profiles = (profilesResult.data ?? []) as UserProfile[];
  const assignments = (assignmentsResult.data ?? []) as Assignment[];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const users = authUsers.map((user) => {
    const profile = profileMap.get(user.id);

    return {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      created_at: user.created_at,
      profile,
      assignments: assignments.filter((assignment) => assignment.user_id === user.id),
    };
  });

  const customers = [
    ...new Set(
      (customersResult.data ?? [])
        .map((row) => row.customer)
        .filter(Boolean)
    ),
  ].sort();

  return {
    users,
    customers,
  };
}

export default async function AdminUsuariosPage() {
  const { users, customers } = await getAdminUsersData();

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-2xl font-bold text-slate-950">Usuarios y carteras</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestión de roles, usuarios activos y clientes asignados.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50">
            Command Center
          </Link>
          <Link
            href="/ficha-cliente"
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Ficha Cliente
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Crear nuevo usuario</h2>

        <form action={createUserAction} className="grid gap-3 md:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
              placeholder="usuario@empresa.com"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Nombre</span>
            <input
              name="full_name"
              className="w-full rounded border px-3 py-2"
              placeholder="Nombre visible"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Rol</span>
            <select name="role" defaultValue="OPERATOR" className="w-full rounded border px-3 py-2">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Password temporal</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded border px-3 py-2"
              placeholder="mín. 8 caracteres"
            />
          </label>

          <div className="flex items-end">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
              Crear usuario
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        {users.map((user) => {
          const profile = user.profile;

          return (
            <div key={user.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {profile?.full_name || user.email}
                  </h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">{user.id}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    profile?.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {profile?.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <form action={updateUserProfileAction} className="mb-4 grid gap-3 md:grid-cols-5">
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="email" value={user.email} />

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Nombre</span>
                  <input
                    name="full_name"
                    defaultValue={profile?.full_name ?? ""}
                    className="w-full rounded border px-3 py-2"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Rol</span>
                  <select
                    name="role"
                    defaultValue={profile?.role ?? "OPERATOR"}
                    className="w-full rounded border px-3 py-2"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={profile?.is_active ?? true}
                    className="h-4 w-4"
                  />
                  <span>Activo</span>
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Guardar perfil
                  </button>
                </div>
              </form>

              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Clientes asignados</h3>

                <div className="mb-3 flex flex-wrap gap-2">
                  {user.assignments.length > 0 ? (
                    user.assignments.map((assignment) => (
                      <form key={assignment.id} action={removeCustomerAssignmentAction}>
                        <input type="hidden" name="assignment_id" value={assignment.id} />
                        <button
                          type="submit"
                          className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700"
                        >
                          {assignment.customer} ×
                        </button>
                      </form>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sin clientes asignados.</p>
                  )}
                </div>

                <form action={assignCustomerAction} className="flex max-w-xl gap-2">
                  <input type="hidden" name="user_id" value={user.id} />

                  <select name="customer" className="flex-1 rounded border px-3 py-2 text-sm">
                    <option value="">Seleccionar cliente</option>
                    {customers.map((customer) => (
                      <option key={customer} value={customer}>
                        {customer}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    Asignar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}