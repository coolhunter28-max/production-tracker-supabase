import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserAccess } from "@/lib/ownership";

export default async function DesarrolloLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getCurrentUserAccess();

  const canAccessDesarrollo =
    access.isActive &&
    (access.role === "ADMIN" || access.role === "MANAGER");

  if (!canAccessDesarrollo) {
    redirect("/");
  }

  return <>{children}</>;
}