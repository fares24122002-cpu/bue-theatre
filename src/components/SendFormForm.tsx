"use client";

import { useActionState, useState } from "react";
import { sendForm } from "@/app/actions/forms";

export type SessionOption = { id: string; label: string };

/** Actor form: absence or late. The arrival time only shows for late. */
export function SendFormForm({
  sessions,
  selectedId,
}: {
  sessions: SessionOption[];
  selectedId: string | null;
}) {
  const [state, formAction, pending] = useActionState(sendForm, {});
  const [type, setType] = useState<"absence" | "late">("absence");

  return (
    <form action={formAction} className="stack-form">
      <div className="field">
        <label htmlFor="session_id">Workshop</label>
        <select
          id="session_id"
          name="session_id"
          required
          defaultValue={selectedId ?? ""}
          className="select-field"
        >
          <option value="" disabled>
            Choose a workshop
          </option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="field choice-group">
        <legend>What are you sending?</legend>
        <label className="choice">
          <input
            type="radio"
            name="type"
            value="absence"
            checked={type === "absence"}
            onChange={() => setType("absence")}
          />
          I can&apos;t come (absence)
        </label>
        <label className="choice">
          <input
            type="radio"
            name="type"
            value="late"
            checked={type === "late"}
            onChange={() => setType("late")}
          />
          I will be late
        </label>
      </fieldset>

      {type === "late" ? (
        <div className="field">
          <label htmlFor="expected_arrival">Expected arrival time (Cairo time)</label>
          <input id="expected_arrival" name="expected_arrival" type="time" required />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="reason">Reason</label>
        <textarea id="reason" name="reason" rows={4} required minLength={3} maxLength={1000} />
      </div>

      <p className="form-hint">
        Forms must be sent before the workshop starts. Staff will accept or
        reject it and you will get a notification.
        {type === "absence"
          ? " You have 2 excuses. A rejected form counts as an absence."
          : " Being late has no penalty, but staff like to know."}
      </p>

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary display" disabled={pending}>
        {pending ? "SENDING..." : "SEND FORM"}
      </button>
    </form>
  );
}
