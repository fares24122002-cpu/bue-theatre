"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  /** Asks "are you sure?" before running. */
  confirm?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
};

/** A button that runs a Server Action and shows its error or result next to it. */
export function ActionButton({ action, label, confirm, variant, disabled }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="action-form"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={variant === "danger" ? "btn-outline danger" : "btn-outline"}
        disabled={pending || disabled}
      >
        {pending ? "Working..." : label}
      </button>
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
