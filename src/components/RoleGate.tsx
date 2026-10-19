import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/lib/types";

/**
 * Wrap the pages of a protected area. It sends the visitor away unless they
 * are an active member with this role, then shows the page. Place it inside a
 * <Suspense> boundary so the header can appear before the check finishes.
 */
export async function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  await requireRole(role);
  return <>{children}</>;
}
