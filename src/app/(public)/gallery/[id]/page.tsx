import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbum } from "@/lib/content";

export const metadata: Metadata = { title: "Album" };

export default async function AlbumPage({ params }: PageProps<"/gallery/[id]">) {
  const { id } = await params;
  const data = await getAlbum(id);
  if (!data) notFound();
  const { album, photos } = data;

  return (
    <section className="section">
      <Link href="/gallery" className="back-link">
        ← All albums
      </Link>
      <h1 className="section-h display">{album.title}</h1>
      {photos.length === 0 ? (
        <p className="empty">No photos in this album yet.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${album.title}, photo`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
