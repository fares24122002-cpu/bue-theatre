import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for public pages. It sends no cookies, so it always acts as
 * a visitor and only sees what the public is allowed to see.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
