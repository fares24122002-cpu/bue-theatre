import Link from "next/link";
import { Suspense } from "react";
import { RoleGate } from "@/components/RoleGate";
import { NotificationsLink } from "@/components/NotificationsLink";
import { UserMenu } from "@/components/UserMenu";

export default function ActorLayout({ children }: LayoutProps<"/actor">) {
  return (
    <>
      <header className="app-bar">
        <Link href="/actor" className="logo display">
          BUE THEATRE TEAM<span>.</span>
        </Link>
        <nav className="nav" aria-label="Actor">
          <Link href="/actor">Dashboard</Link>
          <Link href="/actor/forms/new">Send a form</Link>
          <Link href="/actor/scan">Scan QR</Link>
          <Suspense fallback={null}>
            <NotificationsLink href="/actor/notifications" />
          </Suspense>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </nav>
      </header>
      <main>
        <Suspense fallback={<div className="container">Loading...</div>}>
          <RoleGate role="actor">{children}</RoleGate>
        </Suspense>
      </main>
    </>
  );
}
