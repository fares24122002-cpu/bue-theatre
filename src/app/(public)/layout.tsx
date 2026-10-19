import Link from "next/link";
import { Suspense } from "react";
import { NextShowBar, SiteFooter } from "@/components/public/Sections";

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
        <nav className="nav" aria-label="Main">
          <Link href="/history">History</Link>
          <Link href="/team">Team</Link>
          <Link href="/shows">Shows</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/login" className="nav-button">
            Log in
          </Link>
        </nav>
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
