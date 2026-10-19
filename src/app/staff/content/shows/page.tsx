import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Shows" };

export default async function StaffShowsPage() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("shows")
    .select("id,title,starts_at,venue,capacity,published")
    .order("starts_at", { ascending: false });
  const shows = data ?? [];
  const left = await Promise.all(
    shows.map(async (s) => {
      if (!s.published) return null;
      const { data: n } = await supabase.rpc("seats_left", { p_show: s.id });
      return typeof n === "number" ? n : null;
    }),
  );

  return (
    <div className="container">
      <div className="page-head">
        <h1 className="display page-title">Shows</h1>
        <Link href="/staff/content/shows/new" className="btn-solid display">
          + NEW SHOW
        </Link>
      </div>
      {shows.length === 0 ? (
        <p className="empty">No shows yet. Create the first one.</p>
      ) : (
        <ul className="list">
          {shows.map((s, i) => (
            <li key={s.id}>
              <Link href={`/staff/content/shows/${s.id}`} className="list-row">
                <span className="list-date display">{formatDay(s.starts_at)}</span>
                <span className="list-main">
                  <strong>{s.title}</strong>
                  <span className="muted">
                    {formatTime(s.starts_at)}
                    {s.venue ? ` · ${s.venue}` : ""}
                    {left[i] !== null ? ` · ${s.capacity - (left[i] as number)} / ${s.capacity} seats booked` : ` · ${s.capacity} seats`}
                  </span>
                </span>
                <span className={s.published ? "chip chip-present" : "chip"}>
                  {s.published ? "Published" : "Hidden"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
