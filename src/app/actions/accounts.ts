"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { queueNotificationEmails } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff create an actor or staff account. Nobody can sign up on their own. */
export async function createAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");

  const name = text(formData.get("full_name"));
  const email = text(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const role = text(formData.get("role")) === "staff" ? "staff" : "actor";

  if (name.length < 2) return { error: "Enter the person's name." };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "The password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return {
      error: taken
        ? "An account with this email already exists."
        : "Could not create the account. Try again.",
    };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, full_name: name, email, role });
  if (profileError) {
    // Do not leave a login without a profile behind.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Could not create the account. Try again." };
  }

  revalidatePath("/staff/actors");
  return {
    message: `Account created for ${name}. Give them the email and the password you chose; they can log in at once.`,
  };
}

/** Reactivate or deactivate an account. Only staff can reactivate. */
export async function setActive(
  profileId: string,
  active: boolean,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const me = await requireRole("staff");
  if (!active && profileId === me.id)
    return { error: "You cannot deactivate your own account." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ active })
    .eq("id", profileId);
  if (error) return { error: "Could not update the account. Try again." };
  await queueNotificationEmails();
  revalidatePath("/staff/actors");
  return {};
}

/** Staff set a new password for someone who forgot theirs. */
export async function setPassword(
  profileId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  if (password.length < 8)
    return { error: "The password must be at least 8 characters." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, {
    password,
  });
  if (error) return { error: "Could not change the password. Try again." };
  return { message: "Password changed. Tell them the new one." };
}
