import Link from "next/link";
import { Suspense } from "react";
import { NextShowBar, SiteFooter } from "@/components/public/Sections";

/** Public pages have no menu: one landing page, plus the reservation and ticket pages. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <NextShowBar />
      </Suspense>
      <header className="site-header">
        <Link href="/" className="logo display">
          BUE THEATRE<span>.</span>
        </Link>
      </header>
      <main>
        <Suspense fallback={<div className="section">Loading...</div>}>{children}</Suspense>
      </main>
      <Suspense
        fallback={
          <footer className="site-footer">
            <div>BUE Theatre Team</div>
            <Link href="/login">ACTOR AND STAFF LOGIN</Link>
          </footer>
        }
      >
        <SiteFooter />
      </Suspense>
    </>
  );
}
