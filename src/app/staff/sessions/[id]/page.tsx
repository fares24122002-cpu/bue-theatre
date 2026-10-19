import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { ActionButton } from "@/components/ActionButton";
import { closeSession, setAttendance, setCancelled } from "@/app/actions/sessions";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { formatFullDay, formatTime } from "@/lib/time";
import { STATUSES, STATUS_LABEL } from "@/lib/session-status";
import type { AttendanceStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Session" };

export default async function StaffSessionPage({
  params,
}: PageProps<"/staff/sessions/[id]">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: s }, { data: tokenRow }, { data: att }, { data: actors }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
      supabase.from("session_tokens").select("qr_token").eq("session_id", id).maybeSingle(),
      supabase.from("attendance").select("actor_id,status,scanned_at").eq("session_id", id),
      supabase
        .from("profiles")
        .select("id,full_name,active")
        .eq("role", "actor")
        .order("full_name"),
    ]);
  if (!s) notFound();

  const statusOf = new Map<string, AttendanceStatus>(
    (att ?? []).map((a) => [a.actor_id, a.status as AttendanceStatus]),
  );
  const scannedAt = new Map<string, string | null>(
    (att ?? []).map((a) => [a.actor_id, a.scanned_at]),
  );
  // Active actors, plus anyone deactivated who still has a mark in this session.
  const people = (actors ?? []).filter((a) => a.active || statusOf.has(a.id));

  const counts = { present: 0, late: 0, excused: 0, absent: 0, none: 0 };
  for (const a of people) {
    const st = statusOf.get(a.id);
    if (st) counts[st] += 1;
    else counts.none += 1;
  }

  const siteUrl = await getSiteUrl();
  const scanUrl = `${siteUrl}/actor/scan?t=${tokenRow?.qr_token ?? ""}`;
  const qr =
    tokenRow && !s.cancelled
      ? await QRCode.toDataURL(scanUrl, { width: 560, margin: 2 })
      : null;

  const canClose =
    !s.cancelled && !s.closed_at && Date.now() >= new Date(s.closes_at).getTime();

  return (
    <div className="container">
      <Link href="/staff/workshops" className="back-link">
        ← All workshops
      </Link>

      <div className="page-head">
        <div>
          <h1 className="display page-title">{s.title}</h1>
          <p className="lead">
            {formatFullDay(s.starts_at)} · starts {formatTime(s.starts_at)} · late
            after {formatTime(s.late_after)} · QR closes {formatTime(s.closes_at)}
            {s.location ? ` · ${s.location}` : ""}
          </p>
          {s.notes ? <p className="muted">{s.notes}</p> : null}
          <p>
            {s.cancelled ? <span className="chip chip-absent">Cancelled</span> : null}{" "}
            {s.closed_at ? <span className="chip">Closed</span> : null}
          </p>
        </div>
        <Link href={`/staff/sessions/${id}/edit`} className="btn-outline">
          Edit
        </Link>
      </div>

      <div className="session-grid">
        <section className="panel" aria-labelledby="qr-h">
          <h2 id="qr-h" className="display section-title">
            Session QR code
          </h2>
          {qr ? (
            <>
              <Image
                src={qr}
                alt="QR code for checking in to this session"
                width={280}
                height={280}
                unoptimized
                className="qr-img"
              />
              <Link href={`/staff/sessions/${id}/qr`} className="btn-solid display">
                SHOW FULL SCREEN
              </Link>
              <p className="form-hint">
                Show it in the room. Actors scan it with their phone. It works
                from one hour before the start until the QR closes.
              </p>
            </>
          ) : (
            <p className="empty">No QR code for a cancelled session.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="count-h">
          <h2 id="count-h" className="display section-title">
            Attendance
          </h2>
          <dl className="stat-row">
            <div><dt>Present</dt><dd>{counts.present}</dd></div>
            <div><dt>Late</dt><dd>{counts.late}</dd></div>
            <div><dt>Excused</dt><dd>{counts.excused}</dd></div>
            <div><dt>Absent</dt><dd>{counts.absent}</dd></div>
            <div><dt>Not marked</dt><dd>{counts.none}</dd></div>
          </dl>
          <div className="actions">
            {!s.closed_at && !s.cancelled ? (
              <>
                <ActionButton
                  action={closeSession.bind(null, id)}
                  label="Close session and mark no-shows absent"
                  confirm="Close this session? Everyone without a mark will be marked absent. An actor's 3rd absence deactivates their account."
                  disabled={!canClose}
                />
                {!canClose ? (
                  <p className="form-hint">
                    You can close the session after the QR code closes at{" "}
                    {formatTime(s.closes_at)}.
                  </p>
                ) : null}
              </>
            ) : null}
            <ActionButton
              action={setCancelled.bind(null, id, !s.cancelled)}
              label={s.cancelled ? "Restore workshop" : "Cancel workshop"}
              confirm={s.cancelled ? undefined : "Cancel this workshop? Actors will no longer be able to check in."}
              variant={s.cancelled ? "default" : "danger"}
            />
          </div>
        </section>
      </div>

      <h2 className="display section-title">Attendance sheet</h2>
      {people.length === 0 ? (
        <p className="empty">No actors yet. Add actors on the Actors page.</p>
      ) : (
        <ul className="sheet">
          {people.map((a) => {
            const st = statusOf.get(a.id);
            const scanned = scannedAt.get(a.id);
            return (
              <li key={a.id} className="sheet-row">
                <span className="sheet-name">
                  {a.full_name}
                  {!a.active ? <span className="chip chip-absent">Deactivated</span> : null}
                  {scanned ? (
                    <span className="muted"> scanned {formatTime(scanned)}</span>
                  ) : null}
                </span>
                <form action={setAttendance} className="sheet-form">
                  <input type="hidden" name="session_id" value={id} />
                  <input type="hidden" name="actor_id" value={a.id} />
                  <label className="sr-only" htmlFor={`st-${a.id}`}>
                    Status for {a.full_name}
                  </label>
                  <select id={`st-${a.id}`} name="status" defaultValue={st ?? "present"}>
                    {STATUSES.map((v) => (
                      <option key={v} value={v}>
                        {STATUS_LABEL[v]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-outline">
                    {st ? "Update" : "Mark"}
                  </button>
                </form>
                <span className={st ? `chip chip-${st}` : "chip"}>
                  {st ? STATUS_LABEL[st] : "Not marked"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
