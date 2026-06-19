import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserAccess } from "@/lib/ownership";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getCurrentUserAccess();

  const canAccessAdmin = access.isActive && access.role === "ADMIN";

  if (!canAccessAdmin) {
    redirect("/");
  }

  return <>{children}</>;
}