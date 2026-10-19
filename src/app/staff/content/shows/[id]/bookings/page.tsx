import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cancelReservation, setCheckedIn } from "@/app/actions/reservations";
import { ActionButton } from "@/components/ActionButton";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage({ params }: PageProps<"/staff/content/shows/[id]/bookings">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: show } = await supabase
    .from("shows")
    .select("id,title,capacity")
    .eq("id", id)
    .maybeSingle();
  if (!show) notFound();
  const { data } = await supabase
    .from("reservations")
    .select("id,name,email,phone,tickets,ticket_code,checked_in,created_at")
    .eq("show_id", id)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const total = rows.reduce((n, r) => n + r.tickets, 0);
  const arrived = rows.filter((r) => r.checked_in).reduce((n, r) => n + r.tickets, 0);

  return (
    <div className="container">
      <Link href={`/staff/content/shows/${id}`} className="back-link">
        ← {show.title}
      </Link>
      <div className="page-head">
        <h1 className="display page-title">Bookings</h1>
        <Link href={`/staff/content/shows/${id}/door`} className="btn-solid display">
          DOOR CHECK-IN
        </Link>
      </div>
      <dl className="stat-row">
        <div><dt>Booked</dt><dd>{total}/{show.capacity}</dd></div>
        <div><dt>Seats left</dt><dd>{Math.max(0, show.capacity - total)}</dd></div>
        <div><dt>Arrived</dt><dd>{arrived}</dd></div>
        <div><dt>Bookings</dt><dd>{rows.length}</dd></div>
      </dl>

      {rows.length === 0 ? (
        <p className="empty">No reservations yet.</p>
      ) : (
        <ul className="cards">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <p className="card-title">
                <strong>{r.name}</strong>
                <span className="chip">{r.tickets} {r.tickets === 1 ? "ticket" : "tickets"}</span>
                {r.checked_in ? <span className="chip chip-present">Arrived</span> : null}
              </p>
              <p className="muted">
                {r.email}
                {r.phone ? ` · ${r.phone}` : ""} · booked {formatDay(r.created_at)} {formatTime(r.created_at)} ·{" "}
                <Link href={`/ticket/${r.ticket_code}`} className="map-link">
                  ticket
                </Link>
              </p>
              <div className="actions tight">
                <ActionButton
                  action={setCheckedIn.bind(null, r.id, id, !r.checked_in)}
                  label={r.checked_in ? "Undo arrived" : "Mark arrived"}
                />
                <ActionButton
                  action={cancelReservation.bind(null, r.id, id)}
                  label="Cancel booking"
                  confirm={`Cancel ${r.name}'s booking? The seats become free again.`}
                  variant="danger"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
