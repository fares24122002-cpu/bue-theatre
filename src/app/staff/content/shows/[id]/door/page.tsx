import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DoorClient } from "@/components/DoorClient";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Door check-in" };

export default async function DoorPage({ params }: PageProps<"/staff/content/shows/[id]/door">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: show } = await supabase.from("shows").select("id,title").eq("id", id).maybeSingle();
  if (!show) notFound();
  const { data: rows } = await supabase
    .from("reservations")
    .select("tickets,checked_in")
    .eq("show_id", id);
  const all = rows ?? [];
  const total = all.reduce((n, r) => n + r.tickets, 0);
  const arrived = all.filter((r) => r.checked_in).reduce((n, r) => n + r.tickets, 0);

  return (
    <div className="container narrow">
      <Link href={`/staff/content/shows/${id}/bookings`} className="back-link">
        ← Bookings
      </Link>
      <h1 className="display page-title">Door check-in</h1>
      <p className="lead">
        {show.title}: <strong>{arrived}</strong> of {total} tickets arrived
        (reload to refresh)
      </p>
      <DoorClient showId={id} />
    </div>
  );
}
