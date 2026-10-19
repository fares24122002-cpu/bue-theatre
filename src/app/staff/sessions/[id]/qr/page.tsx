import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { formatFullDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Session QR code" };

export default async function SessionQrPage({
  params,
}: PageProps<"/staff/sessions/[id]/qr">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: s }, { data: t }] = await Promise.all([
    supabase.from("sessions").select("title,starts_at,late_after,closes_at,cancelled").eq("id", id).maybeSingle(),
    supabase.from("session_tokens").select("qr_token").eq("session_id", id).maybeSingle(),
  ]);
  if (!s || !t || s.cancelled) notFound();

  const url = `${await getSiteUrl()}/actor/scan?t=${t.qr_token}`;
  const qr = await QRCode.toDataURL(url, { width: 900, margin: 2 });

  return (
    <div className="container fullscreen-qr">
      <Link href={`/staff/sessions/${id}`} className="back-link">
        ← Back to the workshop
      </Link>
      <h1 className="display page-title">{s.title}</h1>
      <p className="lead">
        {formatFullDay(s.starts_at)} · starts {formatTime(s.starts_at)} · late after{" "}
        {formatTime(s.late_after)} · closes {formatTime(s.closes_at)}
      </p>
      <Image
        src={qr}
        alt="QR code for checking in to this session"
        width={560}
        height={560}
        unoptimized
        className="qr-big"
      />
      <p className="display scan-cta">Scan to check in</p>
    </div>
  );
}
