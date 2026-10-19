"use client";

import { useActionState } from "react";
import { reserve } from "@/app/actions/reservations";

export function ReserveForm({
  showId,
  maxTickets,
}: {
  showId: string;
  maxTickets: number;
}) {
  const [state, formAction, pending] = useActionState(reserve, {});
  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="show_id" value={showId} />
      {/* Bots fill this in, people never see it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="email">Email (your ticket is tied to it)</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="tickets">Number of tickets</label>
        <select id="tickets" name="tickets" defaultValue="1" className="select-field">
          {Array.from({ length: maxTickets }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary display" disabled={pending}>
        {pending ? "RESERVING..." : "RESERVE FREE TICKETS"}
      </button>
    </form>
  );
}
