import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/ownership";

export default async function SistemaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getCurrentUserAccess();

  const canAccessSistema =
    access.isActive &&
    (access.role === "ADMIN" || access.role === "MANAGER");

  if (!canAccessSistema) {
    redirect("/");
  }

  return <>{children}</>;
}