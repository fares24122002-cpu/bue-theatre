import Link from "next/link";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <>
      <header className="app-bar">
        <Link href="/staff/workshops" className="logo display">
          BUE THEATRE<span>.</span>
          <span className="badge">STAFF</span>
        </Link>
        <nav className="nav" aria-label="Staff">
          <Link href="/staff/workshops">Workshops</Link>
          <Link href="/staff/forms">Forms</Link>
          <Link href="/staff/actors">Actors</Link>
          <Link href="/staff/content">Public content</Link>
          <Link href="/login">Log out</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
