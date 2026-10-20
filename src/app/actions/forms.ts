"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { queueNotificationEmails } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { isTime, toTimeInput } from "@/lib/time";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

/** An actor sends an absence or late form for a workshop that has not started. */
export async function sendForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireRole("actor");

  const sessionId = text(formData.get("session_id"));
  const type = text(formData.get("type"));
  const reason = text(formData.get("reason"));
  const expected = text(formData.get("expected_arrival"));

  if (!sessionId) return { error: "Choose the workshop." };
  if (type !== "absence" && type !== "late")
    return { error: "Choose absence or late." };
  if (reason.length < 3) return { error: "Write the reason." };
  if (reason.length > 1000) return { error: "The reason is too long." };

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("sessions")
    .select("starts_at,closes_at,cancelled")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.cancelled) return { error: "This workshop is not available." };
  if (new Date(s.starts_at).getTime() <= Date.now())
    return { error: "This workshop has already started. Forms must be sent before it starts." };

  if (type === "late") {
    if (!isTime(expected)) return { error: "Enter the time you expect to arrive." };
    if (expected <= toTimeInput(s.starts_at))
      return { error: "The arrival time must be after the workshop starts." };
    if (expected > toTimeInput(s.closes_at))
      return {
        error: `The QR code closes at ${toTimeInput(s.closes_at)}. If you will arrive after that, send an absence form instead.`,
      };
  }

  const { error } = await supabase.from("forms").insert({
    actor_id: me.id,
    session_id: sessionId,
    type,
    reason,
    expected_arrival: type === "late" ? expected : null,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "You already sent a form for this workshop." };
    return { error: "Could not send the form. Try again." };
  }

  await queueNotificationEmails();
  revalidatePath("/actor");
  redirect("/actor?sent=1");
}

/** Staff accept or reject a form. */
export async function reviewForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const formId = text(formData.get("form_id"));
  const decision = text(formData.get("decision"));
  const urgent = formData.get("urgent") === "on";
  if (!formId || (decision !== "accept" && decision !== "reject"))
    return { error: "Something went wrong. Reload the page." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_form", {
    p_form: formId,
    p_accept: decision === "accept",
    p_urgent: urgent,
  });
  if (error) return { error: error.message };

  await queueNotificationEmails();
  revalidatePath("/staff/forms");
  return { message: decision === "accept" ? "Accepted." : "Rejected." };
}

/** Marks all of the logged-in person's notifications as read. */
export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  revalidatePath("/actor/notifications");
  revalidatePath("/staff/notifications");
}
