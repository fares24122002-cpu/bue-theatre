import { headers } from "next/headers";

/**
 * The address people use to reach the site, taken from the request so QR codes
 * always point at the right place (Vercel address now, own domain later).
 * Call inside <Suspense>: it reads the request.
 */
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
