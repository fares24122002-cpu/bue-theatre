import Link from "next/link";
import { Suspense } from "react";
import { RoleGate } from "@/components/RoleGate";
import { NotificationsLink } from "@/components/NotificationsLink";
import { UserMenu } from "@/components/UserMenu";

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
          <Suspense fallback={null}>
            <NotificationsLink href="/staff/notifications" />
          </Suspense>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </nav>
      </header>
      <main>
        <Suspense fallback={<div className="container">Loading...</div>}>
          <RoleGate role="staff">{children}</RoleGate>
        </Suspense>
      </main>
    </>
  );
}
