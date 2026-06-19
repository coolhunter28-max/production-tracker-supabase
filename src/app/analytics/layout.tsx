import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import { CommandPalette } from "@/components/navigation/command-palette";
import { getCurrentUserAccess } from "@/lib/ownership";

export default async function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getCurrentUserAccess();

  const canAccessAnalytics =
    access.isActive &&
    (access.role === "ADMIN" ||
      access.role === "MANAGER" ||
      access.role === "VIEWER");

  if (!canAccessAnalytics) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="mb-4 flex items-center justify-end">
            <CommandPalette />
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}