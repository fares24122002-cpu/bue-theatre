"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/image-upload";

/**
 * Picture field for a form. Uploads straight away and stores the address in a
 * hidden input with the given name, so the form saves it with everything else.
 */
export function ImageUpload({
  name,
  folder,
  label,
  initialUrl,
}: {
  name: string;
  folder: string;
  label: string;
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `${name}-${folder}`;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadImage(file, folder));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={url} />
      <div className="upload-row">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="upload-preview" />
        ) : (
          <div className="upload-preview upload-empty" aria-hidden="true" />
        )}
        <div className="upload-actions">
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} disabled={busy} />
          {busy ? <span className="muted">Uploading...</span> : null}
          {url && !busy ? (
            <button type="button" className="btn-outline" onClick={() => setUrl("")}>
              Remove picture
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
