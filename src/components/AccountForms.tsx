"use client";

import { useActionState } from "react";
import { createAccount, setActorGroups, setPassword } from "@/app/actions/accounts";
import { LANGUAGES, LANGUAGE_LABEL, type Language } from "@/lib/types";

/** Add an actor or staff account. */
export function AddAccountForm() {
  const [state, formAction, pending] = useActionState(createAccount, {});
  return (
    <form action={formAction} className="stack-form">
      <div className="field-row">
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" required minLength={2} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="off" />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="password">Password (they can log in with it at once)</label>
          <input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="role">Account type</label>
          <select id="role" name="role" defaultValue="actor">
            <option value="actor">Actor</option>
            <option value="staff">Staff (director or backstage)</option>
          </select>
        </div>
      </div>
      <fieldset className="field group-pick">
        <legend>Group (actors only: English, Arabic, or both)</legend>
        <GroupChecks defaults={[]} idPrefix="new" />
      </fieldset>
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
      <button type="submit" className="btn-solid display" disabled={pending}>
        {pending ? "CREATING..." : "CREATE ACCOUNT"}
      </button>
    </form>
  );
}

/** Small "set a new password" form for one person. */
export function PasswordForm({ profileId, name }: { profileId: string; name: string }) {
  const [state, formAction, pending] = useActionState(setPassword.bind(null, profileId), {});
  return (
    <form action={formAction} className="inline-form">
      <label className="sr-only" htmlFor={`pw-${profileId}`}>
        New password for {name}
      </label>
      <input
        id={`pw-${profileId}`}
        name="password"
        type="text"
        minLength={8}
        placeholder="New password"
        required
        autoComplete="off"
      />
      <button type="submit" className="btn-outline" disabled={pending}>
        Set
      </button>
      {state.error ? (
        <span className="form-error" role="alert">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="form-ok" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function GroupChecks({ defaults, idPrefix }: { defaults: Language[]; idPrefix: string }) {
  return (
    <div className="check-row">
      {LANGUAGES.map((l) => (
        <label key={l} className="check" htmlFor={`${idPrefix}-${l}`}>
          <input
            id={`${idPrefix}-${l}`}
            type="checkbox"
            name="groups"
            value={l}
            defaultChecked={defaults.includes(l)}
          />
          {LANGUAGE_LABEL[l]}
        </label>
      ))}
    </div>
  );
}

/** Change which groups an actor is in. */
export function GroupsForm({ profileId, groups }: { profileId: string; groups: Language[] }) {
  const [state, formAction, pending] = useActionState(setActorGroups.bind(null, profileId), {});
  return (
    <form action={formAction} className="inline-form">
      <GroupChecks defaults={groups} idPrefix={`g-${profileId}`} />
      <button type="submit" className="btn-outline" disabled={pending}>
        Save groups
      </button>
      {state.error ? (
        <span className="form-error" role="alert">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="form-ok" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
