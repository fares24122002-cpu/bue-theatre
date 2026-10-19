import { connection } from "next/server";
import { markAllRead } from "@/app/actions/forms";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/time";

/** The logged-in person's notifications, newest first. */
export async function NotificationList() {
  await connection();
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id,message,read,created_at")
    .eq("user_id", me?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      {unread > 0 ? (
        <form action={markAllRead}>
          <button type="submit" className="btn-outline">
            Mark all as read
          </button>
        </form>
      ) : null}
      {items.length === 0 ? (
        <p className="empty">No notifications yet.</p>
      ) : (
        <ul className="list">
          {items.map((n) => (
            <li key={n.id} className="list-row static">
              <span className="list-main">
                <strong>{n.message}</strong>
                <span className="muted">
                  {formatDay(n.created_at)} {formatTime(n.created_at)}
                </span>
              </span>
              {!n.read ? <span className="chip chip-absent">New</span> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
