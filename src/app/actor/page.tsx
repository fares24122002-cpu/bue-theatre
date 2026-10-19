import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_ABSENCES, MAX_EXCUSES, attendanceRate, type AttendanceCounts } from "@/lib/rules";
import { STATUS_LABEL } from "@/lib/session-status";
import { formatDay, formatTime } from "@/lib/time";
import type { AttendanceStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My dashboard" };

export default async function ActorDashboardPage() {
  await connection();
  const me = await requireRole("actor");
  const supabase = await createClient();

  const [{ data: att }, { data: upcoming }] = await Promise.all([
    supabase
      .from("attendance")
      .select("status, session:sessions(title,starts_at)")
      .eq("actor_id", me.id),
    supabase
      .from("sessions")
      .select("id,title,location,notes,starts_at,late_after,closes_at")
      .eq("cancelled", false)
      .gte("closes_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(10),
  ]);

  const counts: AttendanceCounts = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const a of att ?? []) counts[a.status as AttendanceStatus] += 1;
  const rate = attendanceRate(counts);

  type Hist = { status: AttendanceStatus; title: string; starts_at: string };
  const history: Hist[] = (att ?? [])
    .map((a) => {
      const s = Array.isArray(a.session) ? a.session[0] : a.session;
      return s ? { status: a.status as AttendanceStatus, title: s.title, starts_at: s.starts_at } : null;
    })
    .filter((x): x is Hist => x !== null)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, 12);

  return (
    <div className="container">
      <h1 className="display page-title">Hello, {me.full_name.split(" ")[0]}</h1>

      <section className="rate-grid" aria-label="My attendance">
        <div className="rate-card">
          <p className="rate-label">Attendance rate</p>
          <p className="rate-value display">{rate === null ? "—" : `${rate}%`}</p>
          <p className="rate-note">
            {rate === null
              ? "No sessions held yet."
              : "Present and late count as attended. Excused and absent both lower it."}
          </p>
        </div>
        <dl className="stat-row stat-big">
          <div><dt>Times late</dt><dd>{counts.late}</dd></div>
          <div><dt>Excuses used</dt><dd>{me.excuses_used}/{MAX_EXCUSES}</dd></div>
          <div><dt>Absences</dt><dd>{me.absences_used}/{MAX_ABSENCES}</dd></div>
        </dl>
      </section>
      {me.absences_used >= MAX_ABSENCES ? (
        <p className="form-error" role="status">
          You have used all {MAX_ABSENCES} allowed absences. Another absence
          deactivates your account.
        </p>
      ) : null}

      <div className="actions">
        <Link href="/actor/scan" className="btn-solid display">
          SCAN TO CHECK IN
        </Link>
        <Link href="/actor/forms/new" className="btn-outline">
          Send an absence or late form
        </Link>
      </div>

      <h2 className="display section-title">Upcoming workshops</h2>
      {(upcoming ?? []).length === 0 ? (
        <p className="empty">No workshops scheduled yet.</p>
      ) : (
        <ul className="list">
          {(upcoming ?? []).map((s) => (
            <li key={s.id} className="list-row static">
              <span className="list-date display">{formatDay(s.starts_at)}</span>
              <span className="list-main">
                <strong>{s.title}</strong>
                <span className="muted">
                  {formatTime(s.starts_at)}
                  {s.location ? ` · ${s.location}` : ""} · late after{" "}
                  {formatTime(s.late_after)}
                </span>
                {s.notes ? <span className="muted">{s.notes}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="display section-title">My attendance</h2>
      {history.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <ul className="list">
          {history.map((h, i) => (
            <li key={i} className="list-row static">
              <span className="list-date display">{formatDay(h.starts_at)}</span>
              <span className="list-main">
                <strong>{h.title}</strong>
              </span>
              <span className={`chip chip-${h.status}`}>{STATUS_LABEL[h.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
