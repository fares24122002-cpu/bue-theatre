"use client";

import { useActionState } from "react";
import { saveSession } from "@/app/actions/sessions";
import { LANGUAGE_LABEL, type SessionLanguage } from "@/lib/types";

export type SessionFormValues = {
  id?: string;
  title: string;
  location: string;
  notes: string;
  date: string;
  start: string;
  lateAfter: string;
  closes: string;
  language: SessionLanguage;
};

/** Create or edit a workshop. All times are Cairo time. */
export function SessionForm({ values }: { values: SessionFormValues }) {
  const [state, formAction, pending] = useActionState(saveSession, {});

  return (
    <form action={formAction} className="stack-form">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={values.title}
          placeholder="Acting workshop"
        />
      </div>

      <div className="field">
        <label htmlFor="language">Who is it for?</label>
        <select id="language" name="language" defaultValue={values.language}>
          {(["both", "english", "arabic"] as const).map((l) => (
            <option key={l} value={l}>
              {l === "both" ? "Both groups (English and Arabic)" : `${LANGUAGE_LABEL[l]} group only`}
            </option>
          ))}
        </select>
        <p className="form-hint">
          Only actors in that group see the workshop, can scan in, and are marked
          absent if they do not come.
        </p>
      </div>

      <div className="field">
        <label htmlFor="date">Date</label>
        <input id="date" name="date" type="date" required defaultValue={values.date} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="start">Starts</label>
          <input id="start" name="start" type="time" required defaultValue={values.start} />
        </div>
        <div className="field">
          <label htmlFor="late_after">Late after</label>
          <input
            id="late_after"
            name="late_after"
            type="time"
            required
            defaultValue={values.lateAfter}
          />
        </div>
        <div className="field">
          <label htmlFor="closes">QR closes</label>
          <input id="closes" name="closes" type="time" required defaultValue={values.closes} />
        </div>
      </div>
      <p className="form-hint">
        Times are Cairo time. Actors who scan before &ldquo;Late after&rdquo; are
        present, between &ldquo;Late after&rdquo; and &ldquo;QR closes&rdquo; are
        late, and after that the scan is refused. The code starts working one
        hour before the start.
      </p>

      <div className="field">
        <label htmlFor="location">Location (optional)</label>
        <input
          id="location"
          name="location"
          maxLength={160}
          defaultValue={values.location}
          placeholder="Hall 3, Theatre building"
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Notes for actors (optional)</label>
        <textarea id="notes" name="notes" rows={4} maxLength={1000} defaultValue={values.notes} />
      </div>

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary display" disabled={pending}>
        {pending ? "SAVING..." : values.id ? "SAVE CHANGES" : "CREATE WORKSHOP"}
      </button>
    </form>
  );
}
