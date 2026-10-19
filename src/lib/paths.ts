import type { Role } from "./types";

/** Where each role lands after logging in. */
export function homeFor(role: Role): string {
  return role === "staff" ? "/staff/workshops" : "/actor";
}

/**
 * Only allow returning to a page inside the area the user belongs to.
 * Blocks open redirects such as "//evil.com" or "https://evil.com".
 */
export function safeNext(next: string | null | undefined, role: Role): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  const area = role === "staff" ? "/staff" : "/actor";
  return next === area || next.startsWith(`${area}/`) ? next : null;
}
