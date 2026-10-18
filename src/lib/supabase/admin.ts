import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service role key. It BYPASSES the database rules,
 * so it must only be used in server code (Server Actions, Route Handlers) for
 * things users cannot do themselves: creating actor accounts and saving
 * public ticket reservations. Never import this file from a Client Component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
