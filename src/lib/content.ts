import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { TeamGroup } from "@/lib/types";

export type Settings = {
  story: string;
  tagline: string;
  contact_email: string;
  instagram: string;
};

export type Milestone = {
  id: string;
  year: string;
  title: string;
  summary: string | null;
  sort_order: number;
};

export type TeamMember = {
  id: string;
  name: string;
  photo_url: string | null;
  team_group: TeamGroup;
  role: string | null;
  bio: string | null;
  sort_order: number;
};

export type Show = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  starts_at: string;
  venue: string | null;
  map_url: string | null;
  trailer_url: string | null;
  capacity: number;
  max_tickets_per_booking: number;
  published: boolean;
};

export type ShowPerson = {
  id: string;
  show_id: string;
  person_name: string;
  group_name: "cast" | "crew";
  role: string | null;
  photo_url: string | null;
  sort_order: number;
};

export type Album = {
  id: string;
  title: string;
  show_id: string | null;
  cover_url: string | null;
  created_at: string;
};

export type Photo = { id: string; album_id: string; url: string; sort_order: number };

export const SHOW_COLUMNS =
  "id,title,description,poster_url,starts_at,venue,map_url,trailer_url,capacity,max_tickets_per_booking,published";

export async function getSettings(): Promise<Settings> {
  const { data } = await createPublicClient().from("site_settings").select("key,value");
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as string]));
  return {
    story: map.get("story") ?? "",
    tagline: map.get("tagline") ?? "",
    contact_email: map.get("contact_email") ?? "",
    instagram: map.get("instagram") ?? "",
  };
}

export async function getMilestones(): Promise<Milestone[]> {
  const { data } = await createPublicClient()
    .from("history_milestones")
    .select("id,year,title,summary,sort_order")
    .order("year", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data ?? []) as Milestone[];
}

export async function getTeam(): Promise<TeamMember[]> {
  const { data } = await createPublicClient()
    .from("team_members")
    .select("id,name,photo_url,team_group,role,bio,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as TeamMember[];
}

/** Published shows. upcoming = true: from now on, soonest first. false: past, newest first. */
export async function getShows(upcoming: boolean, limit = 50): Promise<Show[]> {
  await connection();
  const now = new Date().toISOString();
  const q = createPublicClient().from("shows").select(SHOW_COLUMNS).eq("published", true);
  const { data } = upcoming
    ? await q.gte("starts_at", now).order("starts_at", { ascending: true }).limit(limit)
    : await q.lt("starts_at", now).order("starts_at", { ascending: false }).limit(limit);
  return (data ?? []) as Show[];
}

export async function getShow(id: string): Promise<Show | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createPublicClient()
    .from("shows")
    .select(SHOW_COLUMNS)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  return (data as Show | null) ?? null;
}

export async function getShowPeople(showId: string): Promise<ShowPerson[]> {
  const { data } = await createPublicClient()
    .from("show_people")
    .select("id,show_id,person_name,group_name,role,photo_url,sort_order")
    .eq("show_id", showId)
    .order("sort_order", { ascending: true })
    .order("person_name", { ascending: true });
  return (data ?? []) as ShowPerson[];
}

/** Seats left for a show, or null when it is not public. */
export async function getSeatsLeft(showId: string): Promise<number | null> {
  const { data } = await createPublicClient().rpc("seats_left", { p_show: showId });
  return typeof data === "number" ? data : null;
}

export async function getAlbums(limit = 60): Promise<Album[]> {
  const { data } = await createPublicClient()
    .from("albums")
    .select("id,title,show_id,cover_url,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Album[];
}

export async function getAlbum(id: string): Promise<{ album: Album; photos: Photo[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const client = createPublicClient();
  const { data: album } = await client
    .from("albums")
    .select("id,title,show_id,cover_url,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!album) return null;
  const { data: photos } = await client
    .from("photos")
    .select("id,album_id,url,sort_order")
    .eq("album_id", id)
    .order("sort_order", { ascending: true });
  return { album: album as Album, photos: (photos ?? []) as Photo[] };
}

/** Recent albums with their photos, for the single-page gallery. */
export async function getAlbumsWithPhotos(
  albumLimit = 12,
  photoLimit = 60,
): Promise<{ album: Album; photos: Photo[] }[]> {
  const albums = await getAlbums(albumLimit);
  const client = createPublicClient();
  return Promise.all(
    albums.map(async (album) => {
      const { data } = await client
        .from("photos")
        .select("id,album_id,url,sort_order")
        .eq("album_id", album.id)
        .order("sort_order", { ascending: true })
        .limit(photoLimit);
      return { album, photos: (data ?? []) as Photo[] };
    }),
  );
}
