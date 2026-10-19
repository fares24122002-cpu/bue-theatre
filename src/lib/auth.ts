import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/paths";
import type { Role } from "@/lib/types";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  excuses_used: number;
  absences_used: number;
};

/**
 * The logged-in person's profile, or null when nobody is logged in.
 * Asks Supabase to confirm the session (not just trusting the cookie),
 * and is read once per request even if many components call it.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active, excuses_used, absences_used")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/**
 * Use at the top of every protected page, Server Action and Route Handler,
 * close to the data. Sends the visitor away unless they are an active
 * member with the right role. The proxy only does a quick first check.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login?error=deactivated");
  if (profile.role !== role) redirect(homeFor(profile.role));
  return profile;
}
