import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlbumForm } from "@/components/ContentForms";
import { getAlbums } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gallery content" };

export default async function StaffGalleryPage() {
  await connection();
  const albums = await getAlbums();
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("shows")
    .select("id,title")
    .order("starts_at", { ascending: false });

  return (
    <div className="container">
      <h1 className="display page-title">Gallery</h1>

      <h2 className="display section-title">New album</h2>
      <AlbumForm shows={shows ?? []} />

      <h2 className="display section-title">Albums ({albums.length})</h2>
      {albums.length === 0 ? (
        <p className="empty">No albums yet.</p>
      ) : (
        <div className="album-grid">
          {albums.map((a) => (
            <Link key={a.id} href={`/staff/content/gallery/${a.id}`} className="album">
              {a.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover_url} alt="" className="album-cover" loading="lazy" />
              ) : (
                <div className="album-cover album-empty" aria-hidden="true" />
              )}
              <div className="album-title">{a.title}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
