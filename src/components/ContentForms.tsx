"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createAlbum,
  renameAlbum,
  saveMilestone,
  saveSettings,
  saveShow,
  saveShowPerson,
  saveTeamMember,
} from "@/app/actions/content";
import type { ActionState } from "@/lib/action-state";
import { ImageUpload } from "@/components/ImageUpload";
import { TEAM_GROUP_LABEL, TEAM_GROUP_ORDER } from "@/lib/types";

function Result({ state }: { state: ActionState }) {
  return (
    <>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="form-ok" role="status">
          {state.message}
        </p>
      ) : null}
    </>
  );
}

/** Empties the form after a successful "add". */
function useResetOnSuccess(state: ActionState, enabled: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (enabled && state.message) ref.current?.reset();
  }, [state, enabled]);
  return ref;
}

export function SettingsForm({
  values,
}: {
  values: { story: string; tagline: string; contact_email: string; instagram: string };
}) {
  const [state, action, pending] = useActionState(saveSettings, {});
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="story">Our story (a few sentences)</label>
        <textarea id="story" name="story" rows={5} maxLength={4000} defaultValue={values.story} />
      </div>
      <div className="field">
        <label htmlFor="tagline">Team tagline (big red band on the home page)</label>
        <input id="tagline" name="tagline" maxLength={120} defaultValue={values.tagline} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="contact_email">Contact email (footer)</label>
          <input id="contact_email" name="contact_email" type="email" defaultValue={values.contact_email} />
        </div>
        <div className="field">
          <label htmlFor="instagram">Instagram handle (footer)</label>
          <input id="instagram" name="instagram" placeholder="@buetheatre" defaultValue={values.instagram} />
        </div>
      </div>
      <Result state={state} />
      <button type="submit" className="btn-solid display" disabled={pending}>
        {pending ? "SAVING..." : "SAVE"}
      </button>
    </form>
  );
}

export function MilestoneForm({
  m,
}: {
  m?: { id: string; year: string; title: string; summary: string | null };
}) {
  const [state, action, pending] = useActionState(saveMilestone, {});
  const ref = useResetOnSuccess(state, !m);
  const sfx = m?.id ?? "new";
  return (
    <form action={action} ref={ref} className="stack-form milestone-form">
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <div className="field-row">
        <div className="field narrow-field">
          <label htmlFor={`y-${sfx}`}>Year</label>
          <input id={`y-${sfx}`} name="year" required maxLength={12} defaultValue={m?.year} placeholder="2019" />
        </div>
        <div className="field">
          <label htmlFor={`t-${sfx}`}>Title</label>
          <input id={`t-${sfx}`} name="title" required maxLength={120} defaultValue={m?.title} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`s-${sfx}`}>One sentence (optional)</label>
        <input id={`s-${sfx}`} name="summary" maxLength={500} defaultValue={m?.summary ?? ""} />
      </div>
      <Result state={state} />
      <div className="actions tight">
        <button type="submit" className="btn-outline" disabled={pending}>
          {m ? "Save" : "Add milestone"}
        </button>
      </div>
    </form>
  );
}

export function TeamMemberForm({
  m,
}: {
  m?: {
    id: string;
    name: string;
    team_group: string;
    role: string | null;
    bio: string | null;
    photo_url: string | null;
    sort_order: number;
  };
}) {
  const [state, action, pending] = useActionState(saveTeamMember, {});
  const sfx = m?.id ?? "new";
  return (
    <form action={action} className="stack-form">
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor={`n-${sfx}`}>Name</label>
          <input id={`n-${sfx}`} name="name" required maxLength={120} defaultValue={m?.name} />
        </div>
        <div className="field">
          <label htmlFor={`g-${sfx}`}>Group</label>
          <select id={`g-${sfx}`} name="team_group" defaultValue={m?.team_group ?? "cast"}>
            {TEAM_GROUP_ORDER.map((g) => (
              <option key={g} value={g}>
                {TEAM_GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`r-${sfx}`}>Role or character</label>
          <input id={`r-${sfx}`} name="role" maxLength={120} defaultValue={m?.role ?? ""} />
        </div>
        <div className="field narrow-field">
          <label htmlFor={`o-${sfx}`}>Order (0 first)</label>
          <input id={`o-${sfx}`} name="sort_order" inputMode="numeric" defaultValue={m?.sort_order ?? 0} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`b-${sfx}`}>Short bio (optional)</label>
        <textarea id={`b-${sfx}`} name="bio" rows={3} maxLength={600} defaultValue={m?.bio ?? ""} />
      </div>
      <ImageUpload name="photo_url" folder="team" label="Photo" initialUrl={m?.photo_url} />
      <Result state={state} />
      <button type="submit" className="btn-solid display" disabled={pending}>
        {pending ? "SAVING..." : m ? "SAVE" : "ADD TO TEAM"}
      </button>
    </form>
  );
}

export function ShowForm({
  show,
}: {
  show?: {
    id: string;
    title: string;
    description: string | null;
    poster_url: string | null;
    date: string;
    time: string;
    venue: string | null;
    map_url: string | null;
    trailer_url: string | null;
    capacity: number;
    max_tickets: number;
    published: boolean;
  };
}) {
  const [state, action, pending] = useActionState(saveShow, {});
  return (
    <form action={action} className="stack-form">
      {show ? <input type="hidden" name="id" value={show.id} /> : null}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={140} defaultValue={show?.title} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" required defaultValue={show?.date} />
        </div>
        <div className="field">
          <label htmlFor="time">Time (Cairo)</label>
          <input id="time" name="time" type="time" required defaultValue={show?.time} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" maxLength={160} defaultValue={show?.venue ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="map_url">Map link</label>
          <input id="map_url" name="map_url" type="url" placeholder="https://maps.google.com/..." defaultValue={show?.map_url ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="trailer_url">Trailer link (YouTube or other video)</label>
        <input id="trailer_url" name="trailer_url" type="url" placeholder="https://..." defaultValue={show?.trailer_url ?? ""} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="capacity">Seats (capacity)</label>
          <input id="capacity" name="capacity" inputMode="numeric" required defaultValue={show?.capacity ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="max_tickets">Max tickets per booking</label>
          <input id="max_tickets" name="max_tickets" inputMode="numeric" required defaultValue={show?.max_tickets ?? 4} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description (story, director&apos;s note, audience info)</label>
        <textarea id="description" name="description" rows={5} maxLength={4000} defaultValue={show?.description ?? ""} />
      </div>
      <ImageUpload name="poster_url" folder="posters" label="Poster" initialUrl={show?.poster_url} />
      <label className="choice">
        <input type="checkbox" name="published" defaultChecked={show?.published ?? false} />
        Published (visible to visitors, and open for reservations)
      </label>
      <Result state={state} />
      <button type="submit" className="btn-solid display" disabled={pending}>
        {pending ? "SAVING..." : show ? "SAVE SHOW" : "CREATE SHOW"}
      </button>
    </form>
  );
}

export function ShowPersonForm({ showId }: { showId: string }) {
  const [state, action, pending] = useActionState(saveShowPerson, {});
  const ref = useResetOnSuccess(state, true);
  return (
    <form action={action} ref={ref} className="stack-form">
      <input type="hidden" name="show_id" value={showId} />
      <div className="field-row">
        <div className="field">
          <label htmlFor="person_name">Name</label>
          <input id="person_name" name="person_name" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="group_name">Cast or crew</label>
          <select id="group_name" name="group_name" defaultValue="cast">
            <option value="cast">Cast</option>
            <option value="crew">Crew</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="person_role">Character or role</label>
          <input id="person_role" name="role" maxLength={120} />
        </div>
        <div className="field narrow-field">
          <label htmlFor="person_order">Order (0 first)</label>
          <input id="person_order" name="sort_order" inputMode="numeric" defaultValue={0} />
        </div>
      </div>
      <ImageUpload name="photo_url" folder="people" label="Photo (optional)" />
      <Result state={state} />
      <button type="submit" className="btn-outline" disabled={pending}>
        Add to this show
      </button>
    </form>
  );
}

export function AlbumForm({ shows }: { shows: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(createAlbum, {});
  return (
    <form action={action} className="stack-form">
      <div className="field-row">
        <div className="field">
          <label htmlFor="album_title">Album name</label>
          <input id="album_title" name="title" required maxLength={140} />
        </div>
        <div className="field">
          <label htmlFor="album_show">Linked show (optional)</label>
          <select id="album_show" name="show_id" defaultValue="">
            <option value="">No show (an event)</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Result state={state} />
      <button type="submit" className="btn-solid display" disabled={pending}>
        {pending ? "CREATING..." : "CREATE ALBUM"}
      </button>
    </form>
  );
}

export function RenameAlbumForm({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(renameAlbum, {});
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor="rename">
        Album name
      </label>
      <input id="rename" name="title" required maxLength={140} defaultValue={title} />
      <button type="submit" className="btn-outline" disabled={pending}>
        Rename
      </button>
      <Result state={state} />
    </form>
  );
}
