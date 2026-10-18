import Link from "next/link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
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
      <main>{children}</main>
      <footer className="site-footer">
        <div>BUE Theatre Team · [Contact email] · [Instagram handle]</div>
        <Link href="/login">ACTOR AND STAFF LOGIN</Link>
      </footer>
    </>
  );
}
