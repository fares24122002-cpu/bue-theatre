import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deleteAlbum, deletePhoto, setCover } from "@/app/actions/content";
import { ActionButton } from "@/components/ActionButton";
import { RenameAlbumForm } from "@/components/ContentForms";
import { PhotoUploader } from "@/components/PhotoUploader";
import { getAlbum } from "@/lib/content";

export const metadata: Metadata = { title: "Album" };

export default async function StaffAlbumPage({
  params,
}: PageProps<"/staff/content/gallery/[id]">) {
  await connection();
  const { id } = await params;
  const data = await getAlbum(id);
  if (!data) notFound();
  const { album, photos } = data;

  return (
    <div className="container">
      <Link href="/staff/content/gallery" className="back-link">
        ← All albums
      </Link>
      <h1 className="display page-title">{album.title}</h1>
      <RenameAlbumForm id={album.id} title={album.title} />

      <h2 className="display section-title">Photos ({photos.length})</h2>
      <PhotoUploader albumId={album.id} />
      {photos.length === 0 ? (
        <p className="empty">No photos yet.</p>
      ) : (
        <ul className="manage-photos">
          {photos.map((p) => (
            <li key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" loading="lazy" />
              {album.cover_url === p.url ? (
                <span className="chip chip-present">Cover</span>
              ) : (
                <ActionButton action={setCover.bind(null, album.id, p.url)} label="Make cover" />
              )}
              <ActionButton
                action={deletePhoto.bind(null, p.id)}
                label="Remove"
                confirm="Remove this photo?"
                variant="danger"
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="display section-title">Delete album</h2>
      <ActionButton
        action={deleteAlbum.bind(null, album.id)}
        label="Delete this album and its photos"
        confirm="Delete this album? The photos are removed from the site."
        variant="danger"
      />
    </div>
  );
}
