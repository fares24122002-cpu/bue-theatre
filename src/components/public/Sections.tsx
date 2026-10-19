import Link from "next/link";
import {
  getAlbums,
  getMilestones,
  getSeatsLeft,
  getSettings,
  getShows,
  getTeam,
  type Show,
  type TeamMember,
} from "@/lib/content";
import { TEAM_GROUP_LABEL, type TeamGroup } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/time";

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

function PersonRow({ p, size }: { p: TeamMember; size: number }) {
  return (
    <div className="person">
      <Avatar url={p.photo_url} name={p.name} size={size} />
      <div>
        <div className="person-name">{p.name}</div>
        {p.role ? <div className="muted">{p.role}</div> : null}
        {p.bio ? <div className="person-bio">{p.bio}</div> : null}
      </div>
    </div>
  );
}

/** Our story + milestones (dark block). */
export async function HistorySection({ heading = "h1" }: { heading?: "h1" | "h2" }) {
  const [settings, milestones] = await Promise.all([getSettings(), getMilestones()]);
  const H = heading;
  return (
    <section id="about" className="history">
      <div className="history-inner">
        <div className="history-left">
          <H className="display history-title">
            OUR
            <br />
            STORY
          </H>
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

/** Director, assistant director, backstage, media team, cast. */
export async function TeamSection({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const team = await getTeam();
  const H = heading;
  const by = (g: TeamGroup) => team.filter((t) => t.team_group === g);
  const block = (g: TeamGroup, size: number) => (
    <div className="team-block">
      <h3 className="team-heading display">{TEAM_GROUP_LABEL[g].toUpperCase()}</h3>
      {by(g).length === 0 ? (
        <p className="muted team-empty">Coming soon.</p>
      ) : (
        by(g).map((p) => <PersonRow key={p.id} p={p} size={size} />)
      )}
    </div>
  );
  return (
    <section id="team" className="section">
      <H className="section-h display">MEET THE TEAM</H>
      <div className="team-rows">
        <div className="team-row">
          {block("director", 88)}
          {block("assistant_director", 88)}
        </div>
        <div className="team-row">
          {block("backstage", 72)}
          {block("media", 72)}
        </div>
        <div className="team-block">
          <h3 className="team-heading display">CAST</h3>
          {by("cast").length === 0 ? (
            <p className="muted team-empty">Coming soon.</p>
          ) : (
            <div className="cast-grid">
              {by("cast").map((p) => (
                <PersonRow key={p.id} p={p} size={72} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ShowRow({ s, seats, past }: { s: Show; seats: number | null; past?: boolean }) {
  const soldOut = seats !== null && seats <= 0;
  return (
    <div className="show-row">
      <div className="show-date display">{formatDay(s.starts_at).toUpperCase()}</div>
      <div className="show-main">
        <div className="show-title display">{s.title}</div>
        <div className="muted">
          {formatTime(s.starts_at)}
          {s.venue ? ` · ${s.venue}` : ""}
          {!past && seats !== null ? ` · ${soldOut ? "sold out" : `${seats} seats left`}` : ""}
        </div>
      </div>
      <Link href={`/shows/${s.id}`} className="show-cta">
        {past || soldOut ? "DETAILS →" : "RESERVE →"}
      </Link>
    </div>
  );
}

export async function ShowsSection({
  heading = "h2",
  showPast = false,
}: {
  heading?: "h1" | "h2";
  showPast?: boolean;
}) {
  const upcoming = await getShows(true);
  const seats = await Promise.all(upcoming.map((s) => getSeatsLeft(s.id)));
  const past = showPast ? await getShows(false, 20) : [];
  const H = heading;
  return (
    <section id="shows" className="section">
      <H className="section-h display">UPCOMING SHOWS</H>
      {upcoming.length === 0 ? (
        <p className="empty">No shows announced yet. Check back soon.</p>
      ) : (
        <div className="show-list">
          {upcoming.map((s, i) => (
            <ShowRow key={s.id} s={s} seats={seats[i]} />
          ))}
        </div>
      )}
      {past.length > 0 ? (
        <>
          <h2 className="section-h display past-h">PAST SHOWS</h2>
          <div className="show-list">
            {past.map((s) => (
              <ShowRow key={s.id} s={s} seats={null} past />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export async function GallerySection({
  heading = "h2",
  limit = 3,
}: {
  heading?: "h1" | "h2";
  limit?: number;
}) {
  const albums = await getAlbums(limit);
  const H = heading;
  return (
    <section id="gallery" className="section">
      <H className="section-h display">GALLERY</H>
      {albums.length === 0 ? (
        <p className="empty">Photos will appear here after our next show.</p>
      ) : (
        <div className="album-grid">
          {albums.map((a) => (
            <Link key={a.id} href={`/gallery/${a.id}`} className="album">
              {a.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover_url} alt="" className="album-cover" loading="lazy" />
              ) : (
                <div className="album-cover album-empty" aria-hidden="true" />
              )}
              <div className="album-title">{a.title}</div>
            </Link>
          ))}
        </div>
      )}
      {limit < 60 ? (
        <p className="more-link">
          <Link href="/gallery">All albums →</Link>
        </p>
      ) : null}
    </section>
  );
}

/** Red top bar linking to the next show. */
export async function NextShowBar() {
  const [next] = await getShows(true, 1);
  if (!next) return null;
  return (
    <Link href={`/shows/${next.id}`} className="next-bar">
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
