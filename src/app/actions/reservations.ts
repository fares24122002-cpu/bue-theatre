"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { sendTicketEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-() ]{6,30}$/;

/**
 * A visitor reserves free tickets. Runs on the server with the service role
 * because visitors have no database access; the database function checks the
 * capacity and the ticket limits.
 */
export async function reserve(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Hidden field only bots fill in.
  if (text(formData.get("website"))) return { error: "Could not complete the reservation." };

  const showId = text(formData.get("show_id"));
  const name = text(formData.get("name"));
  const email = text(formData.get("email")).toLowerCase();
  const phone = text(formData.get("phone"));
  const tickets = Number(text(formData.get("tickets")));

  if (!/^[0-9a-f-]{36}$/i.test(showId)) return { error: "This show is not available." };
  if (name.length < 2 || name.length > 100) return { error: "Enter your name." };
  if (!EMAIL.test(email) || email.length > 160)
    return { error: "Enter a valid email address. Your ticket is tied to it." };
  if (phone && !PHONE.test(phone)) return { error: "Enter a valid phone number or leave it empty." };
  if (!Number.isInteger(tickets) || tickets < 1 || tickets > 50)
    return { error: "Choose how many tickets you need." };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("book_tickets", {
    p_show: showId,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_tickets: tickets,
  });
  if (error || typeof data !== "string") {
    // P0001 = a rule message written for visitors in the database function.
    return {
      error:
        error?.code === "P0001"
          ? error.message
          : "Could not complete the reservation. Try again.",
    };
  }

  const siteUrl = await getSiteUrl();
  after(() => sendTicketEmail(data, siteUrl));

  revalidatePath(`/shows/${showId}`);
  redirect(`/ticket/${data}`);
}

/** Staff cancel a reservation (frees the seats). */
export async function cancelReservation(
  id: string,
  showId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) return { error: "Could not cancel it. Try again." };
  revalidatePath(`/staff/content/shows/${showId}/bookings`);
  revalidatePath(`/shows/${showId}`);
  return {};
}

/** Staff tick or untick "arrived" by hand. */
export async function setCheckedIn(
  id: string,
  showId: string,
  checkedIn: boolean,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .update({ checked_in: checkedIn })
    .eq("id", id);
  if (error) return { error: "Could not update it. Try again." };
  revalidatePath(`/staff/content/shows/${showId}/bookings`);
  return {};
}

export type DoorResult =
  | { ok: true; name: string; tickets: number; already: boolean }
  | { ok: false; error: string };

/** Staff scan a ticket at the door. */
export async function doorCheckIn(code: string, showId: string): Promise<DoorResult> {
  await requireRole("staff");
  const clean = code.trim().toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(clean)) return { ok: false, error: "That is not a ticket code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("door_check_in", {
    p_code: clean,
    p_show: showId,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Could not check in." };
  const r = data as { name: string; tickets: number; already: boolean };
  revalidatePath(`/staff/content/shows/${showId}/bookings`);
  return { ok: true, name: r.name, tickets: r.tickets, already: r.already };
}

/** Staff send a visitor's ticket email again (lost it, typo fixed, etc.). */
export async function resendTicket(
  code: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const { emailConfigured } = await import("@/lib/email");
  if (!emailConfigured()) return { error: "Emails are not set up yet." };
  const ok = await sendTicketEmail(code, await getSiteUrl());
  return ok ? { message: "Ticket email sent." } : { error: "Could not send the email. Try again." };
}
