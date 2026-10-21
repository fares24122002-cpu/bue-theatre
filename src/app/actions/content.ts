"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { TEAM_GROUP_ORDER } from "@/lib/types";
import { cairoToDate, isDate, isTime } from "@/lib/time";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";

const SAVE_FAILED = "Could not save. Try again.";

/** Only pictures uploaded to our own media bucket are accepted. */
function mediaUrl(v: string): string | null | "invalid" {
  if (!v) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
  return v.startsWith(prefix) && v.length < 600 ? v : "invalid";
}

/** Links to maps and videos must be web addresses. */
function webUrl(v: string): string | null | "invalid" {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "invalid";
  } catch {
    return "invalid";
  }
}

function intIn(v: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/* ------------------------------ Site text ------------------------------ */

export async function saveSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const background = mediaUrl(text(formData.get("story_background")));
  if (background === "invalid") return { error: "That picture is not valid. Upload it again." };
  const rows = [
    { key: "story_background", value: background ?? "" },
    { key: "story", value: text(formData.get("story")).slice(0, 4000) },
    { key: "tagline", value: text(formData.get("tagline")).slice(0, 120) },
    { key: "contact_email", value: text(formData.get("contact_email")).slice(0, 160) },
    { key: "instagram", value: text(formData.get("instagram")).slice(0, 80) },
  ];
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

/* ------------------------------ Milestones ----------------------------- */

export async function saveMilestone(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const id = text(formData.get("id"));
  const year = text(formData.get("year"));
  const title = text(formData.get("title"));
  const summary = text(formData.get("summary"));
  if (!year || year.length > 12) return { error: "Enter the year." };
  if (!title || title.length > 120) return { error: "Enter a title." };

  const row = { year, title, summary: summary ? summary.slice(0, 500) : null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("history_milestones").update(row).eq("id", id)
    : await supabase.from("history_milestones").insert(row);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: id ? "Saved." : "Milestone added." };
}

export async function deleteMilestone(
  id: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase.from("history_milestones").delete().eq("id", id);
  if (error) return { error: "Could not remove it. Try again." };
  revalidatePath("/", "layout");
  return {};
}

/* -------------------------------- Team --------------------------------- */

const GROUPS: string[] = [...TEAM_GROUP_ORDER];

export async function saveTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  const group = text(formData.get("team_group"));
  const role = text(formData.get("role"));
  const bio = text(formData.get("bio"));
  const photo = mediaUrl(text(formData.get("photo_url")));
  const order = intIn(text(formData.get("sort_order")) || "0", 0, 9999);

  if (!name || name.length > 120) return { error: "Enter the name." };
  if (!GROUPS.includes(group)) return { error: "Choose a group." };
  if (photo === "invalid") return { error: "The photo is not valid. Upload it again." };
  if (order === null) return { error: "The order must be a number from 0 to 9999." };

  const row = {
    name,
    team_group: group,
    role: role ? role.slice(0, 120) : null,
    bio: bio ? bio.slice(0, 600) : null,
    photo_url: photo,
    sort_order: order,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("team_members").update(row).eq("id", id)
    : await supabase.from("team_members").insert(row);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: id ? "Saved." : "Added to the team." };
}

export async function deleteTeamMember(
  id: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return { error: "Could not remove them. Try again." };
  revalidatePath("/", "layout");
  return {};
}

/* -------------------------------- Shows -------------------------------- */

export async function saveShow(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const id = text(formData.get("id"));
  const title = text(formData.get("title"));
  const date = text(formData.get("date"));
  const time = text(formData.get("time"));
  const venue = text(formData.get("venue"));
  const description = text(formData.get("description"));
  const map = webUrl(text(formData.get("map_url")));
  const trailer = webUrl(text(formData.get("trailer_url")));
  const poster = mediaUrl(text(formData.get("poster_url")));
  const capacity = intIn(text(formData.get("capacity")), 0, 100000);
  const maxTickets = intIn(text(formData.get("max_tickets")), 1, 50);
  const published = formData.get("published") === "on";

  if (!title || title.length > 140) return { error: "Enter the show title." };
  if (!isDate(date) || !isTime(time)) return { error: "Choose the date and time." };
  if (map === "invalid") return { error: "The map link must start with https://" };
  if (trailer === "invalid") return { error: "The trailer link must start with https://" };
  if (poster === "invalid") return { error: "The poster is not valid. Upload it again." };
  if (capacity === null) return { error: "Enter the number of seats." };
  if (maxTickets === null) return { error: "Max tickets per booking must be from 1 to 50." };

  const row = {
    title,
    description: description ? description.slice(0, 4000) : null,
    poster_url: poster,
    starts_at: cairoToDate(date, time).toISOString(),
    venue: venue ? venue.slice(0, 160) : null,
    map_url: map,
    trailer_url: trailer,
    capacity,
    max_tickets_per_booking: maxTickets,
    published,
  };
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("shows").update(row).eq("id", id);
    if (error) return { error: SAVE_FAILED };
    revalidatePath("/", "layout");
    return { message: published ? "Saved. The show is public." : "Saved. The show is hidden from visitors." };
  }
  const { data, error } = await supabase.from("shows").insert(row).select("id").single();
  if (error || !data) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  redirect(`/staff/content/shows/${data.id}`);
}

export async function saveShowPerson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const showId = text(formData.get("show_id"));
  const name = text(formData.get("person_name"));
  const group = text(formData.get("group_name"));
  const role = text(formData.get("role"));
  const photo = mediaUrl(text(formData.get("photo_url")));
  const order = intIn(text(formData.get("sort_order")) || "0", 0, 9999);

  if (!showId) return { error: "Something went wrong. Reload the page." };
  if (!name || name.length > 120) return { error: "Enter the name." };
  if (group !== "cast" && group !== "crew") return { error: "Choose cast or crew." };
  if (photo === "invalid") return { error: "The photo is not valid. Upload it again." };
  if (order === null) return { error: "The order must be a number from 0 to 9999." };

  const supabase = await createClient();
  const { error } = await supabase.from("show_people").insert({
    show_id: showId,
    person_name: name,
    group_name: group,
    role: role ? role.slice(0, 120) : null,
    photo_url: photo,
    sort_order: order,
  });
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: "Added." };
}

export async function deleteShowPerson(
  id: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase.from("show_people").delete().eq("id", id);
  if (error) return { error: "Could not remove them. Try again." };
  revalidatePath("/", "layout");
  return {};
}

/* ------------------------------- Gallery ------------------------------- */

export async function createAlbum(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const title = text(formData.get("title"));
  const showId = text(formData.get("show_id"));
  if (!title || title.length > 140) return { error: "Enter the album name." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("albums")
    .insert({ title, show_id: showId || null })
    .select("id")
    .single();
  if (error || !data) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  redirect(`/staff/content/gallery/${data.id}`);
}

export async function renameAlbum(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const id = text(formData.get("id"));
  const title = text(formData.get("title"));
  if (!id || !title || title.length > 140) return { error: "Enter the album name." };
  const supabase = await createClient();
  const { error } = await supabase.from("albums").update({ title }).eq("id", id);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function deleteAlbum(
  id: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) return { error: "Could not delete the album. Try again." };
  revalidatePath("/", "layout");
  redirect("/staff/content/gallery");
}

/** Called by the browser after the pictures are uploaded. */
export async function addPhotos(albumId: string, urls: string[]): Promise<ActionState> {
  await requireRole("staff");
  const clean = urls.map((u) => mediaUrl(u)).filter((u): u is string => !!u && u !== "invalid");
  if (clean.length === 0) return { error: "No valid pictures." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("photos")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (last?.sort_order ?? -1) + 1;
  const { error } = await supabase
    .from("photos")
    .insert(clean.map((url) => ({ album_id: albumId, url, sort_order: next++ })));
  if (error) return { error: SAVE_FAILED };

  // The first picture becomes the cover if the album has none.
  const { data: album } = await supabase.from("albums").select("cover_url").eq("id", albumId).maybeSingle();
  if (album && !album.cover_url) {
    await supabase.from("albums").update({ cover_url: clean[0] }).eq("id", albumId);
  }
  revalidatePath("/", "layout");
  return { message: `${clean.length} ${clean.length === 1 ? "photo" : "photos"} added.` };
}

export async function deletePhoto(
  photoId: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("album_id,url")
    .eq("id", photoId)
    .maybeSingle();
  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) return { error: "Could not remove the photo. Try again." };
  if (photo) {
    // If it was the cover, use the next picture (or none).
    const { data: album } = await supabase
      .from("albums")
      .select("cover_url")
      .eq("id", photo.album_id)
      .maybeSingle();
    if (album?.cover_url === photo.url) {
      const { data: rest } = await supabase
        .from("photos")
        .select("url")
        .eq("album_id", photo.album_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      await supabase
        .from("albums")
        .update({ cover_url: rest?.url ?? null })
        .eq("id", photo.album_id);
    }
  }
  revalidatePath("/", "layout");
  return {};
}

export async function setCover(
  albumId: string,
  url: string,
  _prev: ActionState,
  _fd: FormData,
): Promise<ActionState> {
  await requireRole("staff");
  if (mediaUrl(url) === "invalid") return { error: "Not a valid picture." };
  const supabase = await createClient();
  const { error } = await supabase.from("albums").update({ cover_url: url }).eq("id", albumId);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { message: "Cover changed." };
}
