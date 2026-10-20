import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { TicketDownload } from "@/components/TicketDownload";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import { formatFullDay, formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

export default async function TicketPage({ params }: PageProps<"/ticket/[code]">) {
  await connection();
  const { code } = await params;
  if (!/^[0-9a-f]{16}$/.test(code)) notFound();

  // The ticket code is a long random secret, so knowing it is the proof of ownership.
  const admin = createAdminClient();
  const { data: res } = await admin
    .from("reservations")
    .select("name,tickets,checked_in,show:shows(id,title,starts_at,venue,map_url)")
    .eq("ticket_code", code)
    .maybeSingle();
  if (!res) notFound();
  const show = Array.isArray(res.show) ? res.show[0] : res.show;
  if (!show) notFound();

  const qr = await QRCode.toDataURL(`${await getSiteUrl()}/ticket/${code}`, {
    width: 560,
    margin: 2,
  });
  const when = `${formatFullDay(show.starts_at)} · ${formatTime(show.starts_at)}`;

  return (
    <div className="section narrow-section">
      <h1 className="section-h display">You&apos;re booked</h1>
      <div className="ticket">
        <p className="display ticket-title">{show.title}</p>
        <p className="lead">{when}</p>
        {show.venue ? <p className="lead">{show.venue}</p> : null}
        {show.map_url ? (
          <a href={show.map_url} target="_blank" rel="noopener noreferrer" className="map-link">
            OPEN IN MAPS →
          </a>
        ) : null}
        <p className="ticket-who">
          {res.tickets} {res.tickets === 1 ? "ticket" : "tickets"} · {res.name}
        </p>
        <Image src={qr} alt="Your ticket QR code" width={280} height={280} unoptimized className="qr-img" />
        <p className="muted mono">{code}</p>
        {res.checked_in ? <p className="chip chip-present">Checked in</p> : null}
      </div>
      <div className="actions">
        <TicketDownload
          qr={qr}
          title={show.title}
          when={when}
          venue={show.venue}
          name={res.name}
          tickets={res.tickets}
          code={code}
        />
        <Link href={`/#show-${show.id}`} className="btn-outline">
          Back to the site
        </Link>
      </div>
      <p className="form-hint">
        Show this QR code at the door. Save this page or download the ticket:
        anyone with this link can use the ticket, so keep it to yourself.
      </p>
    </div>
  );
}
