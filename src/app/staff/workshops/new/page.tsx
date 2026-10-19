import type { Metadata } from "next";
import Link from "next/link";
import { SessionForm } from "@/components/SessionForm";

export const metadata: Metadata = { title: "New workshop" };

export default function NewWorkshopPage() {
  return (
    <div className="container narrow">
      <Link href="/staff/workshops" className="back-link">
        ← All workshops
      </Link>
      <h1 className="display page-title">New workshop</h1>
      <SessionForm
        values={{
          title: "",
          location: "",
          notes: "",
          date: "",
          start: "",
          lateAfter: "",
          closes: "",
        }}
      />
    </div>
  );
}
