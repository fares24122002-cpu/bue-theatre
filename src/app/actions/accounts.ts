"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { queueNotificationEmails } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/action-state";
import { isLanguage, type Language } from "@/lib/types";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The language groups ticked on a form, without duplicates. */
function readGroups(formData: FormData): Language[] {
  const picked = formData.getAll("groups").filter(isLanguage);
  return [...new Set(picked)];
}

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
  const groups = readGroups(formData);

  if (name.length < 2) return { error: "Enter the person's name." };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "The password must be at least 8 characters." };
  if (role === "actor" && groups.length === 0)
    return { error: "Choose the actor's group: English, Arabic, or both." };

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

  if (role === "actor") {
    const { error: groupError } = await admin
      .from("actor_groups")
      .insert(groups.map((language) => ({ actor_id: data.user.id, language })));
    if (groupError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: "Could not create the account. Try again." };
    }
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
  // Reactivating an account also puts the actor back in all their groups.
  // Groups go first so the account notice is the only one they receive.
  if (active) {
    await admin.from("actor_groups").update({ active: true }).eq("actor_id", profileId);
  }
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

/** Staff change which groups (English, Arabic) an actor is in. */
export async function setActorGroups(
  profileId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const wanted = readGroups(formData);
  if (wanted.length === 0)
    return { error: "An actor must be in at least one group." };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("actor_groups")
    .select("language")
    .eq("actor_id", profileId);
  const have = new Set((current ?? []).map((g) => g.language as Language));

  const toAdd = wanted.filter((l) => !have.has(l));
  const toRemove = [...have].filter((l) => !wanted.includes(l));

  if (toRemove.length > 0) {
    const { error } = await admin
      .from("actor_groups")
      .delete()
      .eq("actor_id", profileId)
      .in("language", toRemove);
    if (error) return { error: "Could not save the groups. Try again." };
  }
  if (toAdd.length > 0) {
    const { error } = await admin
      .from("actor_groups")
      .insert(toAdd.map((language) => ({ actor_id: profileId, language })));
    if (error) return { error: "Could not save the groups. Try again." };
  }

  // If only removed groups were left active, the account has nothing to attend.
  const { data: left } = await admin
    .from("actor_groups")
    .select("active")
    .eq("actor_id", profileId);
  if (!(left ?? []).some((g) => g.active)) {
    await admin.from("profiles").update({ active: false }).eq("id", profileId);
    await queueNotificationEmails();
  }

  revalidatePath("/staff/actors");
  return { message: "Groups saved." };
}

/** Remove an actor from one group, or put them back. Only staff can put them back. */
export async function setGroupActive(
  profileId: string,
  language: Language,
  active: boolean,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const admin = createAdminClient();
  const { error } = await admin
    .from("actor_groups")
    .update({ active })
    .eq("actor_id", profileId)
    .eq("language", language);
  if (error) return { error: "Could not update the group. Try again." };

  if (active) {
    // Putting someone back in a group also turns their account back on.
    await admin.from("profiles").update({ active: true }).eq("id", profileId);
  } else {
    const { data: left } = await admin
      .from("actor_groups")
      .select("active")
      .eq("actor_id", profileId);
    if (!(left ?? []).some((g) => g.active)) {
      await admin.from("profiles").update({ active: false }).eq("id", profileId);
    }
  }
  await queueNotificationEmails();
  revalidatePath("/staff/actors");
  return {};
}
