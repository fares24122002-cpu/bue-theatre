import { createClient } from "@/lib/supabase/browser";

const MAX_SIDE = 1800;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * Shrinks a picture in the browser (long side 1800px, JPEG) and uploads it to
 * the public "media" bucket. Returns the public address, or throws a message
 * that is safe to show.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP picture.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That picture is too large (15 MB maximum).");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that picture.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that picture.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("Could not process that picture.");

  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error("Upload failed. Check your connection and try again.");

  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
