"use client";

import { useActionState } from "react";
import { reviewForm } from "@/app/actions/forms";

/** Accept / reject buttons for one pending form. */
export function ReviewForm({
  formId,
  canBeUrgent,
}: {
  formId: string;
  /** Absence form from an actor who already used 2 excuses. */
  canBeUrgent: boolean;
}) {
  const [state, formAction, pending] = useActionState(reviewForm, {});
  return (
    <form action={formAction} className="review-form">
      <input type="hidden" name="form_id" value={formId} />
      {canBeUrgent ? (
        <label className="choice">
          <input type="checkbox" name="urgent" />
          Urgent: count as an excuse anyway
        </label>
      ) : null}
      <div className="actions tight">
        <button type="submit" name="decision" value="accept" className="btn-solid display" disabled={pending}>
          ACCEPT
        </button>
        <button type="submit" name="decision" value="reject" className="btn-outline danger" disabled={pending}>
          Reject
        </button>
      </div>
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
    </form>
  );
}
