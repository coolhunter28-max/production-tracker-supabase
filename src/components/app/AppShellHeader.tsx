import Link from "next/link";
import { getCurrentUserAccess } from "@/lib/ownership";

export async function AppShellHeader() {
  const access = await getCurrentUserAccess();

  if (!access.userId) {
    return null;
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-slate-950">
            Production Tracker
          </Link>

          <Link href="/ficha-cliente" className="text-sm text-slate-600 hover:text-slate-950">
            Ficha Cliente
          </Link>

          {access.canAdmin ? (
            <Link href="/admin/usuarios" className="text-sm text-slate-600 hover:text-slate-950">
              Admin
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-700">{access.email}</p>
            <p className="text-[11px] uppercase text-slate-400">{access.role}</p>
          </div>

          <Link
            href="/logout"
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Cerrar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}