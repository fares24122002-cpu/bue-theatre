import type { Metadata } from "next";
import Link from "next/link";
import { ShowForm } from "@/components/ContentForms";

export const metadata: Metadata = { title: "New show" };

export default function NewShowPage() {
  return (
    <div className="container narrow">
      <Link href="/staff/content/shows" className="back-link">
        ← All shows
      </Link>
      <h1 className="display page-title">New show</h1>
      <p className="form-hint">
        Save it hidden first, add the cast and crew on the next page, then
        publish it when it is ready.
      </p>
      <ShowForm />
    </div>
  );
}
