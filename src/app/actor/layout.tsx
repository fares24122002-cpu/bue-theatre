import Link from "next/link";

export default function ActorLayout({ children }: LayoutProps<"/actor">) {
  return (
    <>
      <header className="app-bar">
        <Link href="/actor" className="logo display">
          BUE THEATRE<span>.</span>
        </Link>
        <nav className="nav" aria-label="Actor">
          <Link href="/actor">Dashboard</Link>
          <Link href="/actor/forms/new">Send a form</Link>
          <Link href="/actor/scan">Scan QR</Link>
          <Link href="/login">Log out</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
