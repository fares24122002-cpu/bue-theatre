"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { cairoToDate, isDate, isTime } from "@/lib/time";
import { isStatus } from "@/lib/session-status";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

/** Create or edit a workshop. The form sends Cairo date and times. */
export async function saveSession(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");

  const id = text(formData.get("id"));
  const title = text(formData.get("title"));
  const location = text(formData.get("location"));
  const notes = text(formData.get("notes"));
  const date = text(formData.get("date"));
  const start = text(formData.get("start"));
  const lateAfter = text(formData.get("late_after"));
  const closes = text(formData.get("closes"));

  if (!title) return { error: "Give the workshop a title." };
  if (title.length > 120) return { error: "The title is too long." };
  if (!isDate(date)) return { error: "Choose the date." };
  if (![start, lateAfter, closes].every(isTime))
    return { error: "Fill in all three times." };
  if (!(start <= lateAfter && lateAfter <= closes))
    return {
      error:
        "The times must go in order: start, then late after, then QR closes.",
    };

  const row = {
    title,
    location: location || null,
    notes: notes || null,
    starts_at: cairoToDate(date, start).toISOString(),
    late_after: cairoToDate(date, lateAfter).toISOString(),
    closes_at: cairoToDate(date, closes).toISOString(),
  };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("sessions").update(row).eq("id", id);
    if (error) return { error: "Could not save the changes. Try again." };
    revalidatePath("/staff/workshops");
    redirect(`/staff/sessions/${id}`);
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the workshop. Try again." };
  revalidatePath("/staff/workshops");
  redirect(`/staff/sessions/${data.id}`);
}

/** Cancel a workshop, or bring a cancelled one back. */
export async function setCancelled(
  sessionId: string,
  cancelled: boolean,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ cancelled })
    .eq("id", sessionId);
  if (error) return { error: "Could not update the workshop. Try again." };
  revalidatePath(`/staff/sessions/${sessionId}`);
  revalidatePath("/staff/workshops");
  return {};
}

/** Close a finished session: everyone without a scan is marked absent. */
export async function closeSession(
  sessionId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_session", {
    p_session: sessionId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/staff/sessions/${sessionId}`);
  const n = typeof data === "number" ? data : 0;
  return {
    message:
      n === 0
        ? "Session closed."
        : `Session closed. ${n} ${n === 1 ? "actor was" : "actors were"} marked absent.`,
  };
}

/** Staff correction of one actor's status for one session. */
export async function setAttendance(formData: FormData): Promise<void> {
  const staff = await requireRole("staff");
  const sessionId = text(formData.get("session_id"));
  const actorId = text(formData.get("actor_id"));
  const status = formData.get("status");
  if (!sessionId || !actorId || !isStatus(status)) return;

  const supabase = await createClient();
  await supabase.from("attendance").upsert(
    {
      session_id: sessionId,
      actor_id: actorId,
      status,
      edited_by: staff.id,
    },
    { onConflict: "session_id,actor_id" },
  );
  revalidatePath(`/staff/sessions/${sessionId}`);
}
