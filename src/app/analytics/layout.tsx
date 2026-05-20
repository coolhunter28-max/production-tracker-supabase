import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";

export default function AnalyticsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="min-w-0 flex-1 px-6 py-6">
  {children}
</main>
    </div>
  );
}