import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionForm } from "@/components/SessionForm";
import { createClient } from "@/lib/supabase/server";
import { toDateInput, toTimeInput } from "@/lib/time";

export const metadata: Metadata = { title: "Edit workshop" };

export default async function EditSessionPage({
  params,
}: PageProps<"/staff/sessions/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("sessions")
    .select("id,title,location,notes,starts_at,late_after,closes_at")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  return (
    <div className="container narrow">
      <Link href={`/staff/sessions/${id}`} className="back-link">
        ← Back to the workshop
      </Link>
      <h1 className="display page-title">Edit workshop</h1>
      <SessionForm
        values={{
          id: s.id,
          title: s.title,
          location: s.location ?? "",
          notes: s.notes ?? "",
          date: toDateInput(s.starts_at),
          start: toTimeInput(s.starts_at),
          lateAfter: toTimeInput(s.late_after),
          closes: toTimeInput(s.closes_at),
        }}
      />
    </div>
  );
}
