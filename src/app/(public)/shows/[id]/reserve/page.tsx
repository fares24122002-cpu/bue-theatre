import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReserveForm } from "@/components/ReserveForm";
import { getSeatsLeft, getShow } from "@/lib/content";
import { formatFullDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Reserve tickets" };

export default async function ReservePage({ params }: PageProps<"/shows/[id]/reserve">) {
  await connection();
  const { id } = await params;
  const show = await getShow(id);
  if (!show) notFound();
  const seats = await getSeatsLeft(id);
  const past = new Date(show.starts_at).getTime() <= Date.now();
  const soldOut = seats !== null && seats <= 0;
  const max = Math.max(1, Math.min(show.max_tickets_per_booking, seats ?? show.max_tickets_per_booking));

  return (
    <div className="section narrow-section">
      <Link href={`/#show-${show.id}`} className="back-link">
        ← {show.title}
      </Link>
      <h1 className="section-h display">Reserve your seats</h1>
      <p className="lead">
        {show.title} · {formatFullDay(show.starts_at)} · {formatTime(show.starts_at)}
        {show.venue ? ` · ${show.venue}` : ""}
      </p>
      <p className="muted reserve-note">
        Tickets are free. Up to {show.max_tickets_per_booking} per person.
        {seats !== null && !past && !soldOut ? ` ${seats} seats left.` : ""}
      </p>
      {past ? (
        <p className="empty">This show has already started.</p>
      ) : soldOut ? (
        <p className="empty">Sorry, this show is sold out.</p>
      ) : (
        <ReserveForm showId={show.id} maxTickets={max} />
      )}
    </div>
  );
}
