"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPhotos } from "@/app/actions/content";
import { uploadImage } from "@/lib/image-upload";

/** Add several pictures to an album at once. */
export function PhotoUploader({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []).slice(0, 30);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const urls: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Uploading ${i + 1} of ${files.length}...`);
      try {
        urls.push(await uploadImage(files[i], `gallery/${albumId}`));
      } catch (err) {
        failed.push(`${files[i].name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    if (urls.length > 0) {
      const res = await addPhotos(albumId, urls);
      if (res.error) failed.push(res.error);
      else setStatus(res.message ?? "Done.");
      router.refresh();
    } else {
      setStatus(null);
    }
    if (failed.length > 0) setError(failed.join(" "));
    setBusy(false);
    input.value = "";
  }

  return (
    <div className="field">
      <label htmlFor="photos">Add photos (up to 30 at a time)</label>
      <input
        id="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onPick}
        disabled={busy}
      />
      {status ? (
        <p className="form-ok" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
