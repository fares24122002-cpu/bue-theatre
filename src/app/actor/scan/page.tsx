import type { Metadata } from "next";
import Link from "next/link";
import { ScanClient } from "@/components/ScanClient";

export const metadata: Metadata = { title: "Check in" };

export default async function ScanPage({
  searchParams,
}: PageProps<"/actor/scan">) {
  const sp = await searchParams;
  const t = Array.isArray(sp.t) ? sp.t[0] : sp.t;

  return (
    <div className="container narrow">
      <Link href="/actor" className="back-link">
        ← My dashboard
      </Link>
      <h1 className="display page-title">Check in</h1>
      <ScanClient initialToken={t ?? null} />
    </div>
  );
}
