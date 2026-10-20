import Link from "next/link";
import {
  getAlbumsWithPhotos,
  getMilestones,
  getSeatsLeft,
  getSettings,
  getShowPeople,
  getShows,
  getTeam,
  type Show,
  type ShowPerson,
  type TeamMember,
} from "@/lib/content";
import { TEAM_GROUP_LABEL, type TeamGroup } from "@/lib/types";
import { formatDay, formatFullDay, formatTime } from "@/lib/time";

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} width={size} height={size} className="avatar" loading="lazy" />
  ) : (
    <div className="avatar avatar-empty" style={{ width: size, height: size }} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function PersonRow({ name, role, bio, photo, size }: { name: string; role: string | null; bio?: string | null; photo: string | null; size: number }) {
  return (
    <div className="person">
      <Avatar url={photo} name={name} size={size} />
      <div>
        <div className="person-name">{name}</div>
        {role ? <div className="muted">{role}</div> : null}
        {bio ? <div className="person-bio">{bio}</div> : null}
      </div>
    </div>
  );
}

/** Our story + milestones (dark block). */
export async function HistorySection() {
  const [settings, milestones] = await Promise.all([getSettings(), getMilestones()]);
  return (
    <section id="about" className="history">
      <div className="history-inner">
        <div className="history-left">
          <h1 className="display history-title">
            OUR
            <br />
            STORY
          </h1>
          {settings.story ? <p className="history-text">{settings.story}</p> : null}
        </div>
        <div className="history-right">
          {milestones.map((m) => (
            <div key={m.id} className="milestone">
              <div className="milestone-year display">{m.year}</div>
              <div>
                <div className="milestone-title display">{m.title}</div>
                {m.summary ? <div className="milestone-text">{m.summary}</div> : null}
              </div>
            </div>
          ))}
          {milestones.length === 0 && !settings.story ? (
            <p className="history-text">The team&apos;s story will appear here soon.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Director, assistant director, president, vice president, backstage, media team, cast. */
export async function TeamSection() {
  const team = await getTeam();
  const by = (g: TeamGroup) => team.filter((t) => t.team_group === g);
  const block = (g: TeamGroup, size: number) => (
    <div className="team-block">
      <h3 className="team-heading display">{TEAM_GROUP_LABEL[g].toUpperCase()}</h3>
      {by(g).length === 0 ? (
        <p className="muted team-empty">Coming soon.</p>
      ) : (
        by(g).map((p: TeamMember) => (
          <PersonRow key={p.id} name={p.name} role={p.role} bio={p.bio} photo={p.photo_url} size={size} />
        ))
      )}
    </div>
  );
  return (
    <section id="team" className="section">
      <h2 className="section-h display">MEET THE TEAM</h2>
      <div className="team-rows">
        <div className="team-row">
          {block("director", 88)}
          {block("assistant_director", 88)}
        </div>
        <div className="team-row">
          {block("president", 88)}
          {block("vice_president", 88)}
        </div>
        <div className="team-row">
          {block("backstage", 72)}
          {block("media", 72)}
        </div>
        <div className="team-block">
          <h3 className="team-heading display">{TEAM_GROUP_LABEL.cast.toUpperCase()}</h3>
          {by("cast").length === 0 ? (
            <p className="muted team-empty">Coming soon.</p>
          ) : (
            <div className="cast-grid">
              {by("cast").map((p) => (
                <PersonRow key={p.id} name={p.name} role={p.role} bio={p.bio} photo={p.photo_url} size={72} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ShowPeopleList({ title, people }: { title: string; people: ShowPerson[] }) {
  if (people.length === 0) return null;
  return (
    <div className="team-block">
      <h4 className="team-heading display small-heading">{title}</h4>
      {people.map((p) => (
        <PersonRow key={p.id} name={p.person_name} role={p.role} photo={p.photo_url} size={56} />
      ))}
    </div>
  );
}

/** One upcoming show with everything a visitor needs, on the landing page. */
async function ShowCard({ s }: { s: Show }) {
  const [people, seats] = await Promise.all([getShowPeople(s.id), getSeatsLeft(s.id)]);
  const soldOut = seats !== null && seats <= 0;
  const cast = people.filter((p) => p.group_name === "cast");
  const crew = people.filter((p) => p.group_name === "crew");
  return (
    <article id={`show-${s.id}`} className="show-card">
      <div className="show-hero">
        {s.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.poster_url} alt={`Poster for ${s.title}`} className="poster" loading="lazy" />
        ) : (
          <div className="poster poster-empty" aria-hidden="true" />
        )}
        <div className="show-info">
          <h3 className="display show-h1">{s.title}</h3>
          <dl className="facts">
            <div><dt>DATE</dt><dd>{formatFullDay(s.starts_at)}</dd></div>
            <div><dt>TIME</dt><dd>{formatTime(s.starts_at)}</dd></div>
            {s.venue ? (
              <div>
                <dt>VENUE</dt>
                <dd>{s.venue}</dd>
                {s.map_url ? (
                  <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="map-link">
                    OPEN IN MAPS →
                  </a>
                ) : null}
              </div>
            ) : null}
          </dl>
          {s.description ? <p className="show-desc">{s.description}</p> : null}
          {s.trailer_url ? (
            <p>
              <a href={s.trailer_url} target="_blank" rel="noopener noreferrer" className="show-cta">
                ▶ WATCH THE TRAILER
              </a>
            </p>
          ) : null}
          {soldOut ? (
            <p className="sold-out display">SOLD OUT</p>
          ) : (
            <div className="reserve-row">
              <Link href={`/shows/${s.id}/reserve`} className="btn-solid display">
                RESERVE FREE TICKETS
              </Link>
              {seats !== null ? <span className="muted">{seats} seats left</span> : null}
            </div>
          )}
        </div>
      </div>
      {cast.length + crew.length > 0 ? (
        <div className="team-row show-people">
          <ShowPeopleList title="CAST" people={cast} />
          <ShowPeopleList title="CREW" people={crew} />
        </div>
      ) : null}
    </article>
  );
}

export async function ShowsSection() {
  const [upcoming, past] = await Promise.all([getShows(true), getShows(false, 20)]);
  return (
    <section id="shows" className="section">
      <h2 className="section-h display">UPCOMING SHOWS</h2>
      {upcoming.length === 0 ? (
        <p className="empty">No shows announced yet. Check back soon.</p>
      ) : (
        <div className="show-cards">
          {upcoming.map((s) => (
            <ShowCard key={s.id} s={s} />
          ))}
        </div>
      )}
      {past.length > 0 ? (
        <>
          <h2 className="section-h display past-h">PAST SHOWS</h2>
          <div className="show-list">
            {past.map((s) => (
              <div key={s.id} className="show-row">
                <div className="show-date display">{formatDay(s.starts_at).toUpperCase()}</div>
                <div className="show-main">
                  <div className="show-title display">{s.title}</div>
                  {s.venue ? <div className="muted">{s.venue}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Albums on the landing page. Each one opens in place to show its photos. */
export async function GallerySection() {
  const albums = await getAlbumsWithPhotos();
  return (
    <section id="gallery" className="section">
      <h2 className="section-h display">GALLERY</h2>
      {albums.length === 0 ? (
        <p className="empty">Photos will appear here after our next show.</p>
      ) : (
        <div className="album-stack">
          {albums.map(({ album, photos }) => (
            <details key={album.id} className="album-box">
              <summary className="album-summary">
                {album.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.cover_url} alt="" className="album-thumb" loading="lazy" />
                ) : (
                  <div className="album-thumb album-empty" aria-hidden="true" />
                )}
                <span className="album-summary-text">
                  <span className="album-title">{album.title}</span>
                  <span className="muted">
                    {photos.length} {photos.length === 1 ? "photo" : "photos"} · tap to open
                  </span>
                </span>
              </summary>
              <div className="photo-grid album-photos">
                {photos.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`${album.title}, photo`} loading="lazy" />
                  </a>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

/** Red top bar: one tap to reserve for the next show. */
export async function NextShowBar() {
  const [next] = await getShows(true, 1);
  if (!next) return null;
  return (
    <Link href={`/shows/${next.id}/reserve`} className="next-bar">
      <span>
        NEXT SHOW: {next.title} · {formatDay(next.starts_at)} {formatTime(next.starts_at)}
        {next.venue ? ` · ${next.venue}` : ""}
      </span>
      <span className="next-bar-cta">RESERVE FREE TICKETS →</span>
    </Link>
  );
}

export async function TaglineBand() {
  const { tagline } = await getSettings();
  if (!tagline) return null;
  return (
    <div className="tagline">
      <div className="tagline-inner display">{tagline}</div>
    </div>
  );
}

export async function SiteFooter() {
  const s = await getSettings();
  const parts = ["BUE Theatre Team", s.contact_email, s.instagram].filter(Boolean);
  return (
    <footer className="site-footer">
      <div>{parts.join(" · ")}</div>
      <Link href="/login">ACTOR AND STAFF LOGIN</Link>
    </footer>
  );
}
