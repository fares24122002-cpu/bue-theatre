"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const deactivated = params.get("error") === "deactivated";

  const [state, formAction, pending] = useActionState(login, initialState);

  const message =
    state.error ??
    (deactivated
      ? "Your account is deactivated. Contact the director or backstage team."
      : undefined);

  return (
    <form action={formAction} className="login-form">
      <h1 className="display">Log in</h1>

      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div aria-live="polite">
        {message ? (
          <p className="form-error" role="alert">
            {message}
          </p>
        ) : null}
      </div>

      <button type="submit" className="btn-primary display" disabled={pending}>
        {pending ? "Logging in..." : "Log in"}
      </button>

      <p className="form-hint">
        Accounts are created by the team staff. If you cannot log in, ask the
        director or backstage team.
      </p>
    </form>
  );
}
