import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

/** "Notifications (2)" link for the app bar. Place inside <Suspense>. */
export async function NotificationsLink({ href }: { href: string }) {
  const me = await getCurrentProfile();
  if (!me) return null;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", me.id)
    .eq("read", false);
  const n = count ?? 0;
  return (
    <Link href={href}>
      Notifications{n > 0 ? <span className="badge-count">{n}</span> : null}
    </Link>
  );
}
