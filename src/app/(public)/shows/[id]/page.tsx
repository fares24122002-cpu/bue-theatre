import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSeatsLeft, getShow, getShowPeople, type ShowPerson } from "@/lib/content";
import { formatFullDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Show" };

function People({ title, people }: { title: string; people: ShowPerson[] }) {
  return (
    <div className="team-block">
      <h3 className="team-heading display">{title}</h3>
      {people.length === 0 ? (
        <p className="muted team-empty">To be announced.</p>
      ) : (
        people.map((p) => (
          <div key={p.id} className="person">
            {p.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt={p.person_name} width={72} height={72} className="avatar" loading="lazy" />
            ) : (
              <div className="avatar avatar-empty" style={{ width: 72, height: 72 }} aria-hidden="true">
                {p.person_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="person-name">{p.person_name}</div>
              {p.role ? <div className="muted">{p.role}</div> : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default async function ShowPage({ params }: PageProps<"/shows/[id]">) {
  await connection();
  const { id } = await params;
  const show = await getShow(id);
  if (!show) notFound();
  const [people, seats] = await Promise.all([getShowPeople(id), getSeatsLeft(id)]);
  const past = new Date(show.starts_at).getTime() < Date.now();
  const soldOut = seats !== null && seats <= 0;

  return (
    <div className="section">
      <Link href="/shows" className="back-link">
        ← ALL SHOWS
      </Link>
      <div className="show-hero">
        {show.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={show.poster_url} alt={`Poster for ${show.title}`} className="poster" />
        ) : (
          <div className="poster poster-empty" aria-hidden="true" />
        )}
        <div className="show-info">
          <h1 className="display show-h1">{show.title}</h1>
          <dl className="facts">
            <div><dt>DATE</dt><dd>{formatFullDay(show.starts_at)}</dd></div>
            <div><dt>TIME</dt><dd>{formatTime(show.starts_at)}</dd></div>
            {show.venue ? (
              <div>
                <dt>VENUE</dt>
                <dd>{show.venue}</dd>
                {show.map_url ? (
                  <a href={show.map_url} target="_blank" rel="noopener noreferrer" className="map-link">
                    OPEN IN MAPS →
                  </a>
                ) : null}
              </div>
            ) : null}
          </dl>
          {show.description ? <p className="show-desc">{show.description}</p> : null}
          {past ? (
            <p className="muted">This show has taken place.</p>
          ) : soldOut ? (
            <p className="sold-out display">SOLD OUT</p>
          ) : (
            <div className="reserve-row">
              <Link href={`/shows/${show.id}/reserve`} className="btn-solid display">
                RESERVE FREE TICKETS
              </Link>
              {seats !== null ? <span className="muted">{seats} seats left</span> : null}
            </div>
          )}
        </div>
      </div>

      {show.trailer_url ? (
        <div className="trailer">
          <h2 className="section-h display">TRAILER</h2>
          <a href={show.trailer_url} target="_blank" rel="noopener noreferrer" className="show-cta">
            ▶ WATCH THE TRAILER
          </a>
        </div>
      ) : null}

      <h2 className="section-h display crew-h">CAST AND CREW OF THIS SHOW</h2>
      <div className="team-row">
        <People title="CAST" people={people.filter((p) => p.group_name === "cast")} />
        <People title="CREW" people={people.filter((p) => p.group_name === "crew")} />
      </div>
    </div>
  );
}
