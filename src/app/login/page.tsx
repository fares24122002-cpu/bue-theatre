import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <header className="site-header">
        <Link href="/" className="logo display">
          BUE THEATRE TEAM<span>.</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">← Back to the public site</Link>
        </nav>
      </header>

      <main className="login-grid">
        <section className="login-form-side">
          {/* useSearchParams needs a Suspense boundary */}
          <Suspense
            fallback={
              <div className="login-form">
                <h1 className="display">Log in</h1>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </section>

        <aside className="login-info-side">
          <h2 className="display">For the team</h2>
          <p>
            <strong>Actors</strong> see upcoming workshops, scan the session QR
            code, follow their attendance and send absence or late forms.
          </p>
          <p>
            <strong>Staff</strong> run workshops, show the QR code, review forms
            and manage the public site.
          </p>
        </aside>
      </main>
    </>
  );
}
