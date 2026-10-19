import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Workshops" };

type Row = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  late_after: string;
  closes_at: string;
  cancelled: boolean;
  closed_at: string | null;
};

function SessionRow({ s }: { s: Row }) {
  return (
    <li>
      <Link href={`/staff/sessions/${s.id}`} className="list-row">
        <span className="list-date display">{formatDay(s.starts_at)}</span>
        <span className="list-main">
          <strong>{s.title}</strong>
          <span className="muted">
            {formatTime(s.starts_at)} · late after {formatTime(s.late_after)} ·
            QR closes {formatTime(s.closes_at)}
            {s.location ? ` · ${s.location}` : ""}
          </span>
        </span>
        {s.cancelled ? (
          <span className="chip chip-absent">Cancelled</span>
        ) : s.closed_at ? (
          <span className="chip">Closed</span>
        ) : null}
      </Link>
    </li>
  );
}

export default async function StaffWorkshopsPage() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id,title,location,starts_at,late_after,closes_at,cancelled,closed_at")
    .order("starts_at", { ascending: true });
  const all = (data ?? []) as Row[];

  const now = Date.now();
  const upcoming = all.filter((s) => new Date(s.closes_at).getTime() >= now);
  const past = all
    .filter((s) => new Date(s.closes_at).getTime() < now)
    .reverse()
    .slice(0, 30);

  return (
    <div className="container">
      <div className="page-head">
        <h1 className="display page-title">Workshops</h1>
        <Link href="/staff/workshops/new" className="btn-solid display">
          + NEW WORKSHOP
        </Link>
      </div>

      <h2 className="display section-title">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No upcoming workshops. Create the first one.</p>
      ) : (
        <ul className="list">
          {upcoming.map((s) => (
            <SessionRow key={s.id} s={s} />
          ))}
        </ul>
      )}

      <h2 className="display section-title">Past</h2>
      {past.length === 0 ? (
        <p className="empty">Nothing yet.</p>
      ) : (
        <ul className="list">
          {past.map((s) => (
            <SessionRow key={s.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
