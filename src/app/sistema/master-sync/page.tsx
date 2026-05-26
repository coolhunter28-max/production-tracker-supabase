import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { MasterSyncPanel } from "@/app/sistema/master-sync/panel";

export default function MasterSyncPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Import
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Inicio
            </Link>
          </div>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sistema
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Master Sync
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Sincroniza modelos, variantes, precios y snapshots faltantes a partir
          de POs importados desde España. No debe ejecutarse después de
          importaciones China.
        </p>
      </section>

      <MasterSyncPanel />
    </main>
  );
}