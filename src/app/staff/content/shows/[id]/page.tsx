import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deleteShowPerson } from "@/app/actions/content";
import { ActionButton } from "@/components/ActionButton";
import { ShowForm, ShowPersonForm } from "@/components/ContentForms";
import { SHOW_COLUMNS, type Show, type ShowPerson } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { toDateInput, toTimeInput } from "@/lib/time";

export const metadata: Metadata = { title: "Edit show" };

export default async function EditShowPage({
  params,
}: PageProps<"/staff/content/shows/[id]">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("shows").select(SHOW_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const show = data as Show;
  const { data: people } = await supabase
    .from("show_people")
    .select("id,show_id,person_name,group_name,role,photo_url,sort_order")
    .eq("show_id", id)
    .order("sort_order", { ascending: true })
    .order("person_name", { ascending: true });
  const list = (people ?? []) as ShowPerson[];

  const group = (g: "cast" | "crew") => list.filter((p) => p.group_name === g);

  return (
    <div className="container narrow">
      <Link href="/staff/content/shows" className="back-link">
        ← All shows
      </Link>
      <h1 className="display page-title">{show.title}</h1>
      <p className="actions tight">
        {show.published ? (
          <Link href={`/shows/${show.id}`} className="map-link">
            View the public page →
          </Link>
        ) : null}
        <Link href={`/staff/content/shows/${show.id}/bookings`} className="map-link">
          Bookings →
        </Link>
        <Link href={`/staff/content/shows/${show.id}/door`} className="map-link">
          Door check-in →
        </Link>
      </p>

      <ShowForm
        show={{
          id: show.id,
          title: show.title,
          description: show.description,
          poster_url: show.poster_url,
          date: toDateInput(show.starts_at),
          time: toTimeInput(show.starts_at),
          venue: show.venue,
          map_url: show.map_url,
          trailer_url: show.trailer_url,
          capacity: show.capacity,
          max_tickets: show.max_tickets_per_booking,
          published: show.published,
        }}
      />

      {(["cast", "crew"] as const).map((g) => (
        <div key={g}>
          <h2 className="display section-title">{g === "cast" ? "Cast" : "Crew"} ({group(g).length})</h2>
          {group(g).length === 0 ? (
            <p className="empty">Nobody added yet.</p>
          ) : (
            <ul className="list">
              {group(g).map((p) => (
                <li key={p.id} className="list-row static">
                  <span className="list-main">
                    <strong>{p.person_name}</strong>
                    {p.role ? <span className="muted">{p.role}</span> : null}
                  </span>
                  <ActionButton
                    action={deleteShowPerson.bind(null, p.id)}
                    label="Remove"
                    confirm={`Remove ${p.person_name} from this show?`}
                    variant="danger"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <h2 className="display section-title">Add cast or crew</h2>
      <ShowPersonForm showId={show.id} />
    </div>
  );
}
