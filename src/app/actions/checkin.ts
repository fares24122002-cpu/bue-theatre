"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/types";

export type CheckInResult =
  | { ok: true; status: AttendanceStatus; title: string; already: boolean }
  | { ok: false; error: string };

/**
 * An actor checks in with the code from the session QR. The database function
 * decides present, late or refused, using the times staff set.
 */
export async function checkIn(token: string): Promise<CheckInResult> {
  await requireRole("actor");
  const clean = token.trim();
  if (!clean || clean.length > 200)
    return { ok: false, error: "This QR code is not valid." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", { p_token: clean });
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not check in." };

  const r = data as { status: AttendanceStatus; title: string; already: boolean };
  return { ok: true, status: r.status, title: r.title, already: r.already };
}
